/* HELLO, TOMORROW — hand-written ISO-BMFF / MP4 muxer for WebCodecs output. No dependencies.
 *
 *   const mux = new MP4Muxer({ video: { width, height, timescale }, audio: { codec: 'aac'|'opus', sampleRate, channels },
 *                              onData: bytes => ... });
 *   mux.video.description = <avcC bytes from EncodedVideoChunkMetadata.decoderConfig.description>;
 *   mux.addVideo(bytes, { pts, dur, key })   // decode order; pts/dur in video-timescale ticks (integers)
 *   mux.addAudio(bytes, { dur })             // in order; dur in audio-timescale ticks (= samples)
 *   const header = mux.finalize({ audioPriming, audioSamples });   // → Uint8Array  ftyp + moov + mdat header
 *
 * Output file = header ++ (everything passed to onData, in call order). The mdat payload is streamed out as samples
 * arrive (so a long export never has to sit in memory twice); the moov is written last but placed FIRST in the file
 * ("faststart"), which works because moov's size does not depend on the offset values it contains.
 *
 * Boxes (ISO/IEC 14496-12, -14, -15; Opus-in-ISOBMFF 0.8; colour code points ISO/IEC 23091-2):
 *   ftyp · moov{ mvhd · trak{ tkhd · edts/elst · mdia{ mdhd · hdlr · minf{ vmhd|smhd · dinf/dref ·
 *   stbl{ stsd(avc1{avcC,colr,pasp,btrt} | mp4a{esds} | Opus{dOps}) · stts · ctts? · stss? · stsc · stsz · stco|co64 ·
 *   sgpd/sbgp 'roll' (audio) }}}} · udta/meta/ilst (©nam title, ©too tool, ©cmt comment) } · mdat
 * Edit lists: video media_time = composition delay (0 unless the encoder emits B-frames); audio media_time = encoder
 * priming (AAC encoder delay / Opus pre-skip) and segment_duration = the real audio length, so players that honour
 * elst (FFmpeg/Chrome, QuickTime, VLC) trim the priming and the padding of the last frame.
 */
(function (root) {
  'use strict';

  // ------------------------------------------------------------------ byte writer with box nesting
  class ByteWriter {
    constructor(cap = 1 << 16) { this.buf = new Uint8Array(cap); this.dv = new DataView(this.buf.buffer); this.pos = 0; }
    ensure(n) {
      if (this.pos + n <= this.buf.length) return;
      let cap = this.buf.length * 2;
      while (cap < this.pos + n) cap *= 2;
      const nb = new Uint8Array(cap); nb.set(this.buf.subarray(0, this.pos));
      this.buf = nb; this.dv = new DataView(nb.buffer);
    }
    u8(v) { this.ensure(1); this.dv.setUint8(this.pos, v & 255); this.pos += 1; return this; }
    u16(v) { this.ensure(2); this.dv.setUint16(this.pos, v & 0xffff); this.pos += 2; return this; }
    i16(v) { this.ensure(2); this.dv.setInt16(this.pos, v); this.pos += 2; return this; }
    u24(v) { return this.u8(v >>> 16).u16(v & 0xffff); }
    u32(v) { if (!(v >= 0 && v <= 0xffffffff)) throw new RangeError('u32 out of range: ' + v); this.ensure(4); this.dv.setUint32(this.pos, v); this.pos += 4; return this; }
    i32(v) { this.ensure(4); this.dv.setInt32(this.pos, v); this.pos += 4; return this; }
    u64(v) { if (!(v >= 0 && Number.isSafeInteger(v))) throw new RangeError('u64 out of range: ' + v); return this.u32(Math.floor(v / 4294967296)).u32(v % 4294967296); }
    fourcc(s) { if (s.length !== 4) throw new Error('fourcc ' + s); for (let i = 0; i < 4; i++) this.u8(s.charCodeAt(i)); return this; }
    bytes(a) { a = a instanceof Uint8Array ? a : new Uint8Array(a.buffer ? a.buffer.slice(a.byteOffset, a.byteOffset + a.byteLength) : a); this.ensure(a.length); this.buf.set(a, this.pos); this.pos += a.length; return this; }
    zeros(n) { this.ensure(n); this.buf.fill(0, this.pos, this.pos + n); this.pos += n; return this; }
    str(s, nul = true) { const b = new TextEncoder().encode(s); this.bytes(b); if (nul) this.u8(0); return this; }
    box(type, fn) { const start = this.pos; this.u32(0).fourcc(type); fn && fn(); this.dv.setUint32(start, this.pos - start); return this; }
    full(type, version, flags, fn) { return this.box(type, () => { this.u8(version).u24(flags); fn && fn(); }); }
    result() { return this.buf.slice(0, this.pos); }
  }
  const MATRIX = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000];
  const matrix = w => MATRIX.forEach(v => w.u32(v));
  const LANG_UND = ((('u'.charCodeAt(0) - 0x60) << 10) | (('n'.charCodeAt(0) - 0x60) << 5) | ('d'.charCodeAt(0) - 0x60));

  // WebCodecs VideoColorSpace strings → ISO/IEC 23091-2 code points (for the 'colr' nclx box)
  const CP = { bt709: 1, bt470bg: 5, smpte170m: 6, smpte240m: 7, film: 8, bt2020: 9, smpte432: 12 };
  const TC = { bt709: 1, smpte170m: 6, smpte240m: 7, linear: 8, 'iec61966-2-1': 13, pq: 16, hlg: 18 };
  const MC = { rgb: 0, bt709: 1, fcc: 4, bt470bg: 5, smpte170m: 6, smpte240m: 7, 'bt2020-ncl': 9 };

  // MPEG-4 descriptor with minimal-length size field (ISO/IEC 14496-1 §8.3.3)
  function descriptor(tag, body) {
    const w = new ByteWriter(body.length + 8);
    w.u8(tag);
    const n = body.length, sz = [];
    let v = n; do { sz.unshift(v & 0x7f); v >>>= 7; } while (v);
    sz.forEach((b, i) => w.u8(b | (i < sz.length - 1 ? 0x80 : 0)));
    w.bytes(body);
    return w.result();
  }
  const cat = parts => { const n = parts.reduce((a, p) => a + p.length, 0), o = new Uint8Array(n); let k = 0; for (const p of parts) { o.set(p, k); k += p.length; } return o; };

  // run-length helpers
  function rle(values) { const out = []; for (const v of values) { const last = out[out.length - 1]; if (last && last[1] === v) last[0]++; else out.push([1, v]); } return out; }

  class MP4Muxer {
    constructor(opts) {
      this.onData = opts.onData || (() => {});
      this.movieTimescale = opts.movieTimescale || 1000;
      this.title = opts.title || '';
      this.tool = opts.tool || 'mp4mux.js (hand-written) + WebCodecs';
      this.comment = opts.comment || '';
      this.payload = 0;          // mdat payload bytes emitted so far
      this.lastTrack = null;
      this.tracks = [];
      this.finalized = false;
      if (opts.video) this.video = this._track('video', Object.assign({ timescale: 90000 }, opts.video));
      if (opts.audio) this.audio = this._track('audio', Object.assign({ codec: 'aac', channels: 2 }, opts.audio, { timescale: opts.audio.timescale || opts.audio.sampleRate }));
    }
    _track(kind, cfg) {
      const t = { kind, id: this.tracks.length + 1, cfg, timescale: cfg.timescale, description: null,
        sizes: [], pts: [], durs: [], keys: [], chunks: [] /* [payloadOffset, sampleCount] */, bytes: 0, maxSize: 0 };
      this.tracks.push(t);
      return t;
    }
    _add(t, data, pts, dur, key) {
      if (this.finalized) throw new Error('muxer already finalized');
      if (!(data instanceof Uint8Array)) data = new Uint8Array(data);
      if (!Number.isInteger(pts) || !Number.isInteger(dur) || dur <= 0) throw new Error(`bad timing for ${t.kind} sample: pts=${pts} dur=${dur}`);
      if (this.lastTrack !== t || !t.chunks.length) t.chunks.push([this.payload, 0]);
      t.chunks[t.chunks.length - 1][1]++;
      t.sizes.push(data.length); t.pts.push(pts); t.durs.push(dur); t.keys.push(!!key);
      t.bytes += data.length; if (data.length > t.maxSize) t.maxSize = data.length;
      this.lastTrack = t;
      this.payload += data.length;
      this.onData(data);
    }
    addVideo(data, { pts, dur, key }) { this._add(this.video, data, pts, dur, key); }
    addAudio(data, { dur }) {
      const t = this.audio, n = t.sizes.length;
      const pts = n ? t.pts[n - 1] + t.durs[n - 1] : 0;
      this._add(t, data, pts, dur, true);
    }

    // ---------------------------------------------------------------- timing analysis (decode vs presentation order)
    _timing(t) {
      const n = t.sizes.length;
      if (!n) throw new Error(t.kind + ' track has no samples');
      if (t.kind === 'audio') {
        const media = t.durs.reduce((a, b) => a + b, 0);
        const priming = Math.max(0, Math.round(t.cfg.priming || 0));
        let pres = t.cfg.durationSamples != null ? Math.round(t.cfg.durationSamples) : media - priming;
        pres = Math.max(0, Math.min(pres, media - priming));
        return { deltas: t.durs, ctts: null, mediaDur: media, editMediaTime: priming, presDur: pres };
      }
      // video: chunks arrive in decode order carrying presentation timestamps. DTS := the sorted PTS sequence shifted
      // back by the largest reordering depth D, so that DTS <= PTS everywhere (ctts >= 0, version 0); elst skips D.
      const p = t.pts, s = p.slice().sort((a, b) => a - b);
      for (let j = 1; j < n; j++) if (s[j] === s[j - 1]) throw new Error('duplicate video pts ' + s[j]);
      let D = 0;
      for (let j = 0; j < n; j++) D = Math.max(D, s[j] - p[j]);
      const deltas = new Array(n);
      for (let j = 0; j < n - 1; j++) deltas[j] = s[j + 1] - s[j];
      // last sample: duration of the sample that is presented last
      let lastIdx = 0; for (let j = 1; j < n; j++) if (p[j] > p[lastIdx]) lastIdx = j;
      deltas[n - 1] = t.durs[lastIdx];
      const ctts = D > 0 || p.some((v, j) => v !== s[j]) ? p.map((v, j) => v - s[j] + D) : null;
      const mediaDur = deltas.reduce((a, b) => a + b, 0);
      const presDur = (s[n - 1] + t.durs[lastIdx]) - s[0];
      return { deltas, ctts, mediaDur, editMediaTime: D, presDur };
    }

    // ---------------------------------------------------------------- boxes
    _ftyp() {
      const w = new ByteWriter(64);
      const brands = ['isom', 'iso2', 'mp41'];
      if (this.video) brands.push('avc1');
      if (this.audio && this.audio.cfg.codec === 'opus') brands.push('Opus');
      w.box('ftyp', () => { w.fourcc('isom').u32(0x200); brands.forEach(b => w.fourcc(b)); });
      return w.result();
    }
    _stsd(w, t) {
      const c = t.cfg;
      w.full('stsd', 0, 0, () => {
        w.u32(1);
        if (t.kind === 'video') {
          if (!t.description) throw new Error('video description (avcC) missing');
          w.box('avc1', () => {
            w.zeros(6).u16(1);                               // SampleEntry: reserved, data_reference_index
            w.u16(0).u16(0).zeros(12);                        // pre_defined, reserved, pre_defined[3]
            w.u16(c.width).u16(c.height);
            w.u32(0x00480000).u32(0x00480000).u32(0).u16(1);  // 72 dpi, reserved, frame_count
            const name = new TextEncoder().encode((c.compressorName || 'HT WebCodecs H.264').slice(0, 31));
            w.u8(name.length).bytes(name).zeros(31 - name.length);
            w.u16(0x0018).i16(-1);                            // depth, pre_defined
            w.box('avcC', () => w.bytes(t.description));
            const cs = c.colorSpace;
            if (cs && (cs.primaries || cs.transfer || cs.matrix)) {
              w.box('colr', () => {
                w.fourcc('nclx').u16(CP[cs.primaries] || 2).u16(TC[cs.transfer] || 2).u16(MC[cs.matrix] ?? 2).u8(cs.fullRange ? 0x80 : 0);
              });
            }
            w.box('pasp', () => w.u32(1).u32(1));
            const br = this._bitrates(t);
            w.box('btrt', () => w.u32(t.maxSize).u32(br.max).u32(br.avg));
          });
        } else if (c.codec === 'aac') {
          if (!t.description) throw new Error('audio description (AudioSpecificConfig) missing');
          w.box('mp4a', () => {
            w.zeros(6).u16(1);
            w.zeros(8).u16(c.channels).u16(16).u16(0).u16(0).u32(c.sampleRate * 65536);
            const br = this._bitrates(t);
            const dcd = new ByteWriter(32);
            dcd.u8(0x40).u8((0x05 << 2) | 1).u24(t.maxSize).u32(br.max).u32(br.avg);   // Audio ISO/IEC 14496-3, AudioStream
            dcd.bytes(descriptor(0x05, new Uint8Array(t.description)));
            const es = new ByteWriter(64);
            es.u16(t.id).u8(0);                                                          // ES_ID, flags
            es.bytes(descriptor(0x04, dcd.result()));
            es.bytes(descriptor(0x06, new Uint8Array([0x02])));                          // SLConfig predefined = MP4
            w.full('esds', 0, 0, () => w.bytes(descriptor(0x03, es.result())));
          });
        } else if (c.codec === 'opus') {
          w.box('Opus', () => {
            w.zeros(6).u16(1);
            w.zeros(8).u16(c.channels).u16(16).u16(0).u16(0).u32(48000 * 65536);
            w.box('dOps', () => {
              w.u8(0).u8(c.channels).u16(Math.max(0, Math.round(c.priming || 0))).u32(c.inputSampleRate || c.sampleRate).i16(0).u8(0);
            });
          });
        } else throw new Error('unsupported audio codec ' + c.codec);
      });
    }
    _bitrates(t) {
      const ts = t.timescale;
      const dur = t.durs.reduce((a, b) => a + b, 0) / ts;
      const avg = Math.round(t.bytes * 8 / Math.max(dur, 1e-6));
      // max over sliding 1-second windows (sample-aligned)
      let max = 0, lo = 0, bits = 0, tlo = 0, thi = 0;
      for (let hi = 0; hi < t.sizes.length; hi++) {
        bits += t.sizes[hi] * 8; thi += t.durs[hi];
        while (thi - tlo > ts && lo < hi) { bits -= t.sizes[lo] * 8; tlo += t.durs[lo]; lo++; }
        max = Math.max(max, bits);
      }
      return { avg: Math.min(avg, 0xffffffff), max: Math.min(Math.max(max, avg), 0xffffffff) };
    }
    _trak(w, t, tm, base, use64) {
      const mts = this.movieTimescale;
      const editDur = Math.round(tm.presDur * mts / t.timescale);
      const isV = t.kind === 'video';
      w.box('trak', () => {
        w.full('tkhd', 0, 3, () => {
          w.u32(0).u32(0).u32(t.id).u32(0).u32(editDur).zeros(8);
          w.i16(0).i16(isV ? 0 : 1).u16(isV ? 0 : 0x0100).u16(0);
          matrix(w);
          w.u32(isV ? t.cfg.width * 65536 : 0).u32(isV ? t.cfg.height * 65536 : 0);
        });
        w.box('edts', () => w.full('elst', 0, 0, () => { w.u32(1).u32(editDur).i32(tm.editMediaTime).i16(1).i16(0); }));
        w.box('mdia', () => {
          w.full('mdhd', 0, 0, () => { w.u32(0).u32(0).u32(t.timescale).u32(tm.mediaDur).u16(LANG_UND).u16(0); });
          w.full('hdlr', 0, 0, () => { w.u32(0).fourcc(isV ? 'vide' : 'soun').zeros(12).str(isV ? 'VideoHandler' : 'SoundHandler'); });
          w.box('minf', () => {
            if (isV) w.full('vmhd', 0, 1, () => w.u16(0).u16(0).u16(0).u16(0));
            else w.full('smhd', 0, 0, () => w.i16(0).u16(0));
            w.box('dinf', () => w.full('dref', 0, 0, () => { w.u32(1); w.full('url ', 0, 1); }));
            w.box('stbl', () => {
              this._stsd(w, t);
              const stts = rle(tm.deltas);
              w.full('stts', 0, 0, () => { w.u32(stts.length); stts.forEach(([n, d]) => w.u32(n).u32(d)); });
              if (tm.ctts) {
                const ctts = rle(tm.ctts);
                w.full('ctts', 0, 0, () => { w.u32(ctts.length); ctts.forEach(([n, o]) => w.u32(n).u32(o)); });
              }
              if (isV && t.keys.some(k => !k)) {
                const keys = []; t.keys.forEach((k, i) => { if (k) keys.push(i + 1); });
                w.full('stss', 0, 0, () => { w.u32(keys.length); keys.forEach(k => w.u32(k)); });
              }
              const stsc = []; t.chunks.forEach(([, n], i) => { if (!stsc.length || stsc[stsc.length - 1][1] !== n) stsc.push([i + 1, n]); });
              w.full('stsc', 0, 0, () => { w.u32(stsc.length); stsc.forEach(([first, n]) => w.u32(first).u32(n).u32(1)); });
              w.full('stsz', 0, 0, () => { w.u32(0).u32(t.sizes.length); t.sizes.forEach(s => w.u32(s)); });
              if (use64) w.full('co64', 0, 0, () => { w.u32(t.chunks.length); t.chunks.forEach(([off]) => w.u64(base + off)); });
              else w.full('stco', 0, 0, () => { w.u32(t.chunks.length); t.chunks.forEach(([off]) => w.u32(base + off)); });
              // audio pre-roll ('roll' sample group, ISO/IEC 14496-12 §10.1 AudioRollRecoveryEntry): a decoder that
              // seeks must decode this many samples earlier to get clean output. AAC: -1 frame (MDCT overlap);
              // Opus: 80 ms (Opus-in-ISOBMFF §4.3.6.2), i.e. -4 frames of 20 ms.
              if (!isV) {
                const fr = t.durs[0] || 1024;
                const roll = t.cfg.codec === 'opus' ? -Math.ceil((0.08 * t.timescale) / fr) : -1;
                w.full('sgpd', 1, 0, () => { w.fourcc('roll').u32(2).u32(1).i16(roll); });
                w.full('sbgp', 0, 0, () => { w.fourcc('roll').u32(1).u32(t.sizes.length).u32(1); });
              }
            });
          });
        });
      });
      return editDur;
    }
    _udta(w) {
      if (!this.title && !this.tool) return;
      const item = (name, text) => w.box(name, () => w.box('data', () => { w.u32(1).u32(0).str(text, false); }));
      w.box('udta', () => w.full('meta', 0, 0, () => {
        w.full('hdlr', 0, 0, () => { w.u32(0).fourcc('mdir').fourcc('appl').zeros(8).u8(0); });
        w.box('ilst', () => {
          if (this.title) item('©nam', this.title);
          if (this.tool) item('©too', this.tool);
          if (this.comment) item('©cmt', this.comment);
        });
      }));
    }
    _moov(base, use64) {
      const w = new ByteWriter(1 << 20);
      const timings = this.tracks.map(t => this._timing(t));
      const mts = this.movieTimescale;
      const movieDur = Math.max(...this.tracks.map((t, i) => Math.round(timings[i].presDur * mts / t.timescale)));
      w.box('moov', () => {
        w.full('mvhd', 0, 0, () => {
          w.u32(0).u32(0).u32(mts).u32(movieDur).u32(0x00010000).u16(0x0100).zeros(10);
          matrix(w); w.zeros(24); w.u32(this.tracks.length + 1);
        });
        this.tracks.forEach((t, i) => this._trak(w, t, timings[i], base, use64));
        this._udta(w);
      });
      return { bytes: w.result(), timings, movieDur };
    }

    /** Build ftyp + moov + mdat header. opts: { audioPriming, audioSamples } (audio edit list). */
    finalize(opts = {}) {
      if (this.audio) {
        if (opts.audioPriming != null) this.audio.cfg.priming = opts.audioPriming;
        if (opts.audioSamples != null) this.audio.cfg.durationSamples = opts.audioSamples;
      }
      const ftyp = this._ftyp();
      const big = this.payload + 8 > 0xffffffff;
      const mdatHdr = new ByteWriter(16);
      if (big) mdatHdr.u32(1).fourcc('mdat').u64(this.payload + 16); else mdatHdr.u32(this.payload + 8).fourcc('mdat');
      const mh = mdatHdr.result();
      let use64 = false;
      let m = this._moov(0, use64);
      let base = ftyp.length + m.bytes.length + mh.length;
      if (base + this.payload > 0xffffffff) { use64 = true; m = this._moov(0, true); base = ftyp.length + m.bytes.length + mh.length; }
      m = this._moov(base, use64);                        // same size, real offsets
      if (ftyp.length + m.bytes.length + mh.length !== base) throw new Error('moov size changed between passes');
      this.finalized = true;
      this.info = {
        headerBytes: base, payloadBytes: this.payload, totalBytes: base + this.payload, co64: use64, movieTimescale: this.movieTimescale,
        movieDuration: m.movieDur / this.movieTimescale,
        tracks: this.tracks.map((t, i) => ({
          id: t.id, kind: t.kind, codec: t.kind === 'video' ? 'avc1' : t.cfg.codec, timescale: t.timescale, samples: t.sizes.length,
          chunks: t.chunks.length, bytes: t.bytes, maxSampleBytes: t.maxSize, keyframes: t.keys.filter(Boolean).length,
          mediaDuration: m.timings[i].mediaDur / t.timescale, presentedDuration: m.timings[i].presDur / t.timescale,
          editMediaTime: m.timings[i].editMediaTime, ctts: !!m.timings[i].ctts, bitrate: this._bitrates(t),
        })),
      };
      return cat([ftyp, m.bytes, mh]);
    }
  }

  root.MP4Muxer = MP4Muxer;
  root.MP4Muxer.ByteWriter = ByteWriter;
})(typeof window !== 'undefined' ? window : globalThis);
