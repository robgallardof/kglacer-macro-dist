// ==UserScript==
// @name         kglacer-macro
// @namespace    https://github.com/robgallardof
// @version      7.0.0
// @description  Signed loader: downloads official KGlacerMacro releases and runs them only after Ed25519 and SHA-256 verification.
// @author       robgallardof + contributors
// @license      MPL-2.0
// @homepageURL  https://github.com/robgallardof/kglacer-macro-dist
// @updateURL    https://raw.githubusercontent.com/robgallardof/kglacer-macro-dist/main/loader.user.js
// @downloadURL  https://raw.githubusercontent.com/robgallardof/kglacer-macro-dist/main/loader.user.js
// @run-at       document-start
// @sandbox      JavaScript
// @match        *://wplace.live/*
// @match        *://*.wplace.live/*
// @include      https://wplace.live/*
// @include      https://*.wplace.live/*
// @grant        unsafeWindow
// @grant        GM_info
// @grant        GM.cookie
// @grant        GM_cookie
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @connect      releases.robertogallardo.dev
// ==/UserScript==

// Loader 7.0.0. Release endpoint: https://releases.robertogallardo.dev/
// Pinned release keys: kgm-2026-11
// Third-party code: @noble/ed25519 and @noble/hashes (MIT, Paul Miller).

(() => {
  // src/release/semver.ts
  var SEMVER_PATTERN = /^(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})$/;
  function parseSemVer(value) {
    if (typeof value !== "string")
      return null;
    const match = SEMVER_PATTERN.exec(value);
    if (!match)
      return null;
    return [Number(match[1]), Number(match[2]), Number(match[3])];
  }
  function isSemVer(value) {
    return parseSemVer(value) !== null;
  }
  function compareSemVer(left, right) {
    const a = parseSemVer(left);
    const b = parseSemVer(right);
    if (!a || !b)
      throw new Error(`Invalid semantic version: ${!a ? left : right}`);
    for (let index = 0;index < 3; index++) {
      const difference = a[index] - b[index];
      if (difference !== 0)
        return difference;
    }
    return 0;
  }

  // src/release/manifest.ts
  var MANIFEST_SCHEMA = 1;
  var SIGNATURE_ALGORITHM = "ed25519";
  var HEX_SHA256 = /^[0-9a-f]{64}$/;
  var KEY_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
  var BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
  var ARTIFACT_FILE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
  var MAX_ARTIFACT_BYTES = 32 * 1024 * 1024;
  function releaseDirectory(version) {
    return `releases/v${version}/`;
  }
  function parseSignature(text) {
    const parts = text.trim().split(":");
    if (parts.length !== 3 || parts[0] !== SIGNATURE_ALGORITHM)
      throw new Error("Unsupported manifest signature format");
    const [, keyId, signature] = parts;
    if (!KEY_ID.test(keyId))
      throw new Error("Invalid signing key id");
    if (!BASE64.test(signature) || signature.length !== 88)
      throw new Error("Invalid Ed25519 signature encoding");
    return { keyId, signature };
  }
  function fail(message) {
    throw new Error(`Invalid release manifest: ${message}`);
  }
  function validateArtifact(value, version, label) {
    if (!value || typeof value !== "object")
      fail(`${label} is missing`);
    const entry = value;
    const { path, sha256, size, type } = entry;
    if (typeof path !== "string")
      fail(`${label}.path is missing`);
    const directory = releaseDirectory(version);
    if (!path.startsWith(directory) || !ARTIFACT_FILE.test(path.slice(directory.length)))
      fail(`${label}.path must be a file inside ${directory}`);
    if (typeof sha256 !== "string" || !HEX_SHA256.test(sha256))
      fail(`${label}.sha256 is invalid`);
    if (typeof size !== "number" || !Number.isSafeInteger(size) || size <= 0 || size > MAX_ARTIFACT_BYTES)
      fail(`${label}.size is invalid`);
    if (typeof type !== "string" || !type)
      fail(`${label}.type is missing`);
    return { path, sha256, size, type };
  }
  function validateManifest(value, expectedName) {
    if (!value || typeof value !== "object" || Array.isArray(value))
      fail("not an object");
    const manifest = value;
    if (manifest.schema !== MANIFEST_SCHEMA)
      fail(`unsupported schema ${String(manifest.schema)}`);
    if (manifest.name !== expectedName)
      fail(`unexpected application name ${String(manifest.name)}`);
    const { version, minLoaderVersion, createdAt, commit, artifacts, revoked } = manifest;
    if (!isSemVer(version))
      fail("version is not MAJOR.MINOR.PATCH");
    if (!isSemVer(minLoaderVersion))
      fail("minLoaderVersion is not MAJOR.MINOR.PATCH");
    if (typeof createdAt !== "string" || Number.isNaN(Date.parse(createdAt)))
      fail("createdAt is invalid");
    if (typeof commit !== "string" || !/^[0-9a-f]{7,64}$/.test(commit))
      fail("commit is invalid");
    if (!artifacts || typeof artifacts !== "object")
      fail("artifacts are missing");
    const artifactRecord = artifacts;
    const application = validateArtifact(artifactRecord.application, version, "artifacts.application");
    const core = artifactRecord.core === undefined ? undefined : validateArtifact(artifactRecord.core, version, "artifacts.core");
    if (!Array.isArray(revoked) || !revoked.every(isSemVer))
      fail("revoked must list versions");
    if (revoked.includes(version))
      fail("a release cannot revoke itself");
    return {
      schema: MANIFEST_SCHEMA,
      name: expectedName,
      version,
      minLoaderVersion,
      createdAt,
      commit,
      artifacts: core ? { application, core } : { application },
      revoked: [...revoked]
    };
  }
  function decideUpdate(remote, trustedFloor, loaderVersion) {
    if (compareSemVer(loaderVersion, remote.minLoaderVersion) < 0)
      return { action: "reject-loader", required: remote.minLoaderVersion };
    if (!trustedFloor)
      return { action: "install" };
    const order = compareSemVer(remote.version, trustedFloor);
    if (order < 0)
      return { action: "reject-downgrade" };
    return order === 0 ? { action: "current" } : { action: "update" };
  }

  // node_modules/@noble/ed25519/index.js
  /*! noble-ed25519 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
  var ed25519_CURVE = Object.freeze({
    p: 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffedn,
    n: 0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3edn,
    h: 8n,
    a: 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffecn,
    d: 0x52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3n,
    Gx: 0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51an,
    Gy: 0x6666666666666666666666666666666666666666666666666666666666666658n
  });
  var { p: P, n: N, Gx, Gy, a: _a, d: _d, h } = ed25519_CURVE;
  var L = 32;
  var captureTrace = (...args) => {
    if ("captureStackTrace" in Error && typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(...args);
    }
  };
  var err = (message = "") => {
    const e = new Error(message);
    captureTrace(e, err);
    throw e;
  };
  var isBig = (n) => typeof n === "bigint";
  var isStr = (s) => typeof s === "string";
  var isBytes = (a) => a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && ("BYTES_PER_ELEMENT" in a) && a.BYTES_PER_ELEMENT === 1;
  var abytes = (value, length, title = "") => {
    const bytes = isBytes(value);
    const len = value?.length;
    const needsLen = length !== undefined;
    if (!bytes || needsLen && len !== length) {
      const prefix = title && `"${title}" `;
      const ofLen = needsLen ? ` of length ${length}` : "";
      const got = bytes ? `length=${len}` : `type=${typeof value}`;
      const msg = prefix + "expected Uint8Array" + ofLen + ", got " + got;
      throw bytes ? new RangeError(msg) : new TypeError(msg);
    }
    return value;
  };
  var u8n = (len) => new Uint8Array(len);
  var u8fr = (buf) => Uint8Array.from(buf);
  var padh = (n, pad) => n.toString(16).padStart(pad, "0");
  var bytesToHex = (b) => Array.from(abytes(b)).map((e) => padh(e, 2)).join("");
  var C = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
  var _ch = (ch) => {
    if (ch >= C._0 && ch <= C._9)
      return ch - C._0;
    if (ch >= C.A && ch <= C.F)
      return ch - (C.A - 10);
    if (ch >= C.a && ch <= C.f)
      return ch - (C.a - 10);
    return;
  };
  var hexToBytes = (hex) => {
    const e = "hex invalid";
    if (!isStr(hex))
      return err(e);
    const hl = hex.length;
    const al = hl / 2;
    if (hl % 2)
      return err(e);
    const array = u8n(al);
    for (let ai = 0, hi = 0;ai < al; ai++, hi += 2) {
      const n1 = _ch(hex.charCodeAt(hi));
      const n2 = _ch(hex.charCodeAt(hi + 1));
      if (n1 === undefined || n2 === undefined)
        return err(e);
      array[ai] = n1 * 16 + n2;
    }
    return array;
  };
  var cr = () => globalThis?.crypto;
  var subtle = () => cr()?.subtle ?? err("crypto.subtle must be defined, consider polyfill");
  var concatBytes = (...arrs) => {
    let len = 0;
    for (const a of arrs)
      len += abytes(a).length;
    const r = u8n(len);
    let pad = 0;
    arrs.forEach((a) => {
      r.set(a, pad);
      pad += a.length;
    });
    return r;
  };
  var big = BigInt;
  var assertRange = (n, min, max, msg = "bad number: out of range") => {
    if (!isBig(n))
      throw new TypeError(msg);
    if (min <= n && n < max)
      return n;
    throw new RangeError(msg);
  };
  var M = (a, b = P) => {
    const r = a % b;
    return r >= 0n ? r : b + r;
  };
  var P_MASK = (1n << 255n) - 1n;
  var modP = (num) => {
    if (num < 0n)
      err("negative coordinate");
    let r = (num >> 255n) * 19n + (num & P_MASK);
    r = (r >> 255n) * 19n + (r & P_MASK);
    return r % P;
  };
  var modN = (a) => M(a, N);
  var invert = (num, md) => {
    if (num === 0n || md <= 0n)
      err("no inverse n=" + num + " mod=" + md);
    let a = M(num, md), b = md, x = 0n, y = 1n, u = 1n, v = 0n;
    while (a !== 0n) {
      const q = b / a, r = b % a;
      const m = x - u * q, n = y - v * q;
      b = a, a = r, x = u, y = v, u = m, v = n;
    }
    return b === 1n ? M(x, md) : err("no inverse");
  };
  var callHash = (name) => {
    const fn = hashes[name];
    if (typeof fn !== "function")
      err("hashes." + name + " not set");
    return fn;
  };
  var checkDigest = (value) => abytes(value, 64, "digest");
  var apoint = (p) => p instanceof Point ? p : err("Point expected");
  var B256 = 2n ** 256n;

  class Point {
    static BASE;
    static ZERO;
    X;
    Y;
    Z;
    T;
    constructor(X, Y, Z, T) {
      const max = B256;
      this.X = assertRange(X, 0n, max);
      this.Y = assertRange(Y, 0n, max);
      this.Z = assertRange(Z, 1n, max);
      this.T = assertRange(T, 0n, max);
      Object.freeze(this);
    }
    static CURVE() {
      return ed25519_CURVE;
    }
    static fromAffine(p) {
      return new Point(p.x, p.y, 1n, modP(p.x * p.y));
    }
    static fromBytes(hex, zip215 = false) {
      const d = _d;
      const normed = u8fr(abytes(hex, L));
      const lastByte = hex[31];
      normed[31] = lastByte & ~128;
      const y = bytesToNumberLE(normed);
      const max = zip215 ? B256 : P;
      assertRange(y, 0n, max);
      const y2 = modP(y * y);
      const u = M(y2 - 1n);
      const v = modP(d * y2 + 1n);
      let { isValid, value: x } = uvRatio(u, v);
      if (!isValid)
        err("bad point: y not sqrt");
      const isXOdd = (x & 1n) === 1n;
      const isLastByteOdd = (lastByte & 128) !== 0;
      if (!zip215 && x === 0n && isLastByteOdd)
        err("bad point: x==0, isLastByteOdd");
      if (isLastByteOdd !== isXOdd)
        x = M(-x);
      return new Point(x, y, 1n, modP(x * y));
    }
    static fromHex(hex, zip215) {
      return Point.fromBytes(hexToBytes(hex), zip215);
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    assertValidity() {
      const a = _a;
      const d = _d;
      const p = this;
      if (p.is0())
        return err("bad point: ZERO");
      const { X, Y, Z, T } = p;
      const X2 = modP(X * X);
      const Y2 = modP(Y * Y);
      const Z2 = modP(Z * Z);
      const Z4 = modP(Z2 * Z2);
      const aX2 = modP(X2 * a);
      const left = modP(Z2 * (aX2 + Y2));
      const right = M(Z4 + modP(d * modP(X2 * Y2)));
      if (left !== right)
        return err("bad point: equation left != right (1)");
      const XY = modP(X * Y);
      const ZT = modP(Z * T);
      if (XY !== ZT)
        return err("bad point: equation left != right (2)");
      return this;
    }
    equals(other) {
      const { X: X1, Y: Y1, Z: Z1 } = this;
      const { X: X2, Y: Y2, Z: Z2 } = apoint(other);
      const X1Z2 = modP(X1 * Z2);
      const X2Z1 = modP(X2 * Z1);
      const Y1Z2 = modP(Y1 * Z2);
      const Y2Z1 = modP(Y2 * Z1);
      return X1Z2 === X2Z1 && Y1Z2 === Y2Z1;
    }
    is0() {
      return this.equals(I);
    }
    negate() {
      return new Point(M(-this.X), this.Y, this.Z, M(-this.T));
    }
    double() {
      const { X: X1, Y: Y1, Z: Z1 } = this;
      const a = _a;
      const A = modP(X1 * X1);
      const B = modP(Y1 * Y1);
      const C = modP(2n * Z1 * Z1);
      const D = modP(a * A);
      const x1y1 = M(X1 + Y1);
      const E = M(modP(x1y1 * x1y1) - A - B);
      const G = M(D + B);
      const F = M(G - C);
      const H = M(D - B);
      const X3 = modP(E * F);
      const Y3 = modP(G * H);
      const T3 = modP(E * H);
      const Z3 = modP(F * G);
      return new Point(X3, Y3, Z3, T3);
    }
    add(other) {
      const { X: X1, Y: Y1, Z: Z1, T: T1 } = this;
      const { X: X2, Y: Y2, Z: Z2, T: T2 } = apoint(other);
      const a = _a;
      const d = _d;
      const A = modP(X1 * X2);
      const B = modP(Y1 * Y2);
      const C = modP(modP(T1 * d) * T2);
      const D = modP(Z1 * Z2);
      const E = M(modP(M(X1 + Y1) * M(X2 + Y2)) - A - B);
      const F = M(D - C);
      const G = M(D + C);
      const H = M(B - modP(a * A));
      const X3 = modP(E * F);
      const Y3 = modP(G * H);
      const T3 = modP(E * H);
      const Z3 = modP(F * G);
      return new Point(X3, Y3, Z3, T3);
    }
    subtract(other) {
      return this.add(apoint(other).negate());
    }
    multiply(n, safe = true) {
      if (!safe && n === 0n)
        return I;
      assertRange(n, 1n, N);
      if (!safe && this.is0())
        return I;
      if (n === 1n)
        return this;
      if (this.equals(G))
        return wNAF(n).p;
      let p = I;
      let f = G;
      for (let d = this;n > 0n; d = d.double(), n >>= 1n) {
        if (n & 1n)
          p = p.add(d);
        else if (safe)
          f = f.add(d);
      }
      return p;
    }
    multiplyUnsafe(scalar) {
      return this.multiply(scalar, false);
    }
    toAffine() {
      const { X, Y, Z } = this;
      if (this.equals(I))
        return { x: 0n, y: 1n };
      const iz = invert(Z, P);
      if (modP(Z * iz) !== 1n)
        err("invalid inverse");
      const x = modP(X * iz);
      const y = modP(Y * iz);
      return { x, y };
    }
    toBytes() {
      const { x, y } = this.toAffine();
      const b = numTo32bLE(y);
      b[31] |= x & 1n ? 128 : 0;
      return b;
    }
    toHex() {
      return bytesToHex(this.toBytes());
    }
    clearCofactor() {
      return this.multiply(big(h), false);
    }
    isSmallOrder() {
      return this.clearCofactor().is0();
    }
    isTorsionFree() {
      let p = this.multiply(N / 2n, false).double();
      if (N % 2n)
        p = p.add(this);
      return p.is0();
    }
  }
  var G = new Point(Gx, Gy, 1n, M(Gx * Gy));
  var I = new Point(0n, 1n, 1n, 0n);
  Point.BASE = G;
  Point.ZERO = I;
  var numTo32bLE = (num) => hexToBytes(padh(assertRange(num, 0n, B256), 64)).reverse();
  var bytesToNumberLE = (b) => big("0x" + bytesToHex(u8fr(abytes(b)).reverse()));
  var pow2 = (x, power) => {
    let r = x;
    while (power-- > 0n) {
      r = modP(r * r);
    }
    return r;
  };
  var pow_2_252_3 = (x) => {
    const x2 = modP(x * x);
    const b2 = modP(x2 * x);
    const b4 = modP(pow2(b2, 2n) * b2);
    const b5 = modP(pow2(b4, 1n) * x);
    const b10 = modP(pow2(b5, 5n) * b5);
    const b20 = modP(pow2(b10, 10n) * b10);
    const b40 = modP(pow2(b20, 20n) * b20);
    const b80 = modP(pow2(b40, 40n) * b40);
    const b160 = modP(pow2(b80, 80n) * b80);
    const b240 = modP(pow2(b160, 80n) * b80);
    const b250 = modP(pow2(b240, 10n) * b10);
    const pow_p_5_8 = modP(pow2(b250, 2n) * x);
    return { pow_p_5_8, b2 };
  };
  var RM1 = 0x2b8324804fc1df0b2b4d00993dfbd7a72f431806ad2fe478c4ee1b274a0ea0b0n;
  var uvRatio = (u, v) => {
    const v3 = modP(v * modP(v * v));
    const v7 = modP(modP(v3 * v3) * v);
    const pow = pow_2_252_3(modP(u * v7)).pow_p_5_8;
    let x = modP(u * modP(v3 * pow));
    const vx2 = modP(v * modP(x * x));
    const root1 = x;
    const root2 = modP(x * RM1);
    const useRoot1 = vx2 === u;
    const useRoot2 = vx2 === M(-u);
    const noRoot = vx2 === M(-u * RM1);
    if (useRoot1)
      x = root1;
    if (useRoot2 || noRoot)
      x = root2;
    if ((M(x) & 1n) === 1n)
      x = M(-x);
    return { isValid: useRoot1 || useRoot2, value: x };
  };
  var modL_LE = (hash) => modN(bytesToNumberLE(hash));
  var sha512s = (...m) => checkDigest(callHash("sha512")(concatBytes(...m)));
  var hashFinishS = (res) => res.finish(sha512s(res.hashable));
  var defaultVerifyOpts = { zip215: true };
  var _verify = (sig, msg, publicKey, options = defaultVerifyOpts) => {
    sig = abytes(sig, 64);
    msg = abytes(msg);
    publicKey = abytes(publicKey, L);
    const { zip215 = true } = options;
    const r = sig.subarray(0, L);
    const s = bytesToNumberLE(sig.subarray(L, L * 2));
    let A, R, SB;
    let hashable = Uint8Array.of();
    let finished = false;
    try {
      A = Point.fromBytes(publicKey, zip215);
      R = Point.fromBytes(r, zip215);
      SB = G.multiply(s, false);
      hashable = concatBytes(r, publicKey, msg);
      finished = true;
    } catch (error) {}
    const finish = (hashed) => {
      if (!finished)
        return false;
      if (!zip215 && A.isSmallOrder())
        return false;
      const k = modL_LE(hashed);
      const RkA = R.add(A.multiply(k, false));
      return RkA.subtract(SB).clearCofactor().is0();
    };
    return { hashable, finish };
  };
  var verify = (signature, message, publicKey, opts = defaultVerifyOpts) => hashFinishS(_verify(signature, message, publicKey, opts));
  var hashes = {
    sha512Async: async (message) => {
      const s = subtle();
      const m = concatBytes(message);
      return u8n(await s.digest("SHA-512", m.buffer));
    },
    sha512: undefined
  };
  var W = 8;
  var scalarBits = 256;
  var pwindows = Math.ceil(scalarBits / W) + 1;
  var pwindowSize = 2 ** (W - 1);
  var precompute = () => {
    const points = [];
    let p = G;
    let b = p;
    for (let w = 0;w < pwindows; w++) {
      b = p;
      points.push(b);
      for (let i = 1;i < pwindowSize; i++) {
        b = b.add(p);
        points.push(b);
      }
      p = b.double();
    }
    return points;
  };
  var Gpows = undefined;
  var ctneg = (cnd, p) => {
    const n = p.negate();
    return cnd ? n : p;
  };
  var wNAF = (n) => {
    const comp = Gpows || (Gpows = precompute());
    let p = I;
    let f = G;
    const pow_2_w = 2 ** W;
    const maxNum = pow_2_w;
    const mask = big(pow_2_w - 1);
    const shiftBy = big(W);
    for (let w = 0;w < pwindows; w++) {
      let wbits = Number(n & mask);
      n >>= shiftBy;
      if (wbits > pwindowSize) {
        wbits -= maxNum;
        n += 1n;
      }
      const off = w * pwindowSize;
      const offF = off;
      const offP = off + Math.abs(wbits) - 1;
      const isEven = w % 2 !== 0;
      const isNeg = wbits < 0;
      if (wbits === 0) {
        f = f.add(ctneg(isEven, comp[offF]));
      } else {
        p = p.add(ctneg(isNeg, comp[offP]));
      }
    }
    if (n !== 0n)
      err("invalid wnaf");
    return { p, f };
  };

  // node_modules/@noble/hashes/utils.js
  /*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
  function isBytes2(a) {
    return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
  }
  function abytes2(value, length, title = "") {
    const bytes = isBytes2(value);
    const len = value?.length;
    const needsLen = length !== undefined;
    if (!bytes || needsLen && len !== length) {
      const prefix = title && `"${title}" `;
      const ofLen = needsLen ? ` of length ${length}` : "";
      const got = bytes ? `length=${len}` : `type=${typeof value}`;
      throw new Error(prefix + "expected Uint8Array" + ofLen + ", got " + got);
    }
    return value;
  }
  function aexists(instance, checkFinished = true) {
    if (instance.destroyed)
      throw new Error("Hash instance has been destroyed");
    if (checkFinished && instance.finished)
      throw new Error("Hash#digest() has already been called");
  }
  function aoutput(out, instance) {
    abytes2(out, undefined, "digestInto() output");
    const min = instance.outputLen;
    if (out.length < min) {
      throw new Error('"digestInto() output" expected to be of length >=' + min);
    }
  }
  function clean(...arrays) {
    for (let i = 0;i < arrays.length; i++) {
      arrays[i].fill(0);
    }
  }
  function createView(arr) {
    return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
  }
  function rotr(word, shift) {
    return word << 32 - shift | word >>> shift;
  }
  function createHasher(hashCons, info = {}) {
    const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
    const tmp = hashCons(undefined);
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = (opts) => hashCons(opts);
    Object.assign(hashC, info);
    return Object.freeze(hashC);
  }
  var oidNist = (suffix) => ({
    oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, suffix])
  });

  // node_modules/@noble/hashes/_md.js
  function Chi(a, b, c) {
    return a & b ^ ~a & c;
  }
  function Maj(a, b, c) {
    return a & b ^ a & c ^ b & c;
  }

  class HashMD {
    blockLen;
    outputLen;
    padOffset;
    isLE;
    buffer;
    view;
    finished = false;
    length = 0;
    pos = 0;
    destroyed = false;
    constructor(blockLen, outputLen, padOffset, isLE) {
      this.blockLen = blockLen;
      this.outputLen = outputLen;
      this.padOffset = padOffset;
      this.isLE = isLE;
      this.buffer = new Uint8Array(blockLen);
      this.view = createView(this.buffer);
    }
    update(data) {
      aexists(this);
      abytes2(data);
      const { view, buffer, blockLen } = this;
      const len = data.length;
      for (let pos = 0;pos < len; ) {
        const take = Math.min(blockLen - this.pos, len - pos);
        if (take === blockLen) {
          const dataView = createView(data);
          for (;blockLen <= len - pos; pos += blockLen)
            this.process(dataView, pos);
          continue;
        }
        buffer.set(data.subarray(pos, pos + take), this.pos);
        this.pos += take;
        pos += take;
        if (this.pos === blockLen) {
          this.process(view, 0);
          this.pos = 0;
        }
      }
      this.length += data.length;
      this.roundClean();
      return this;
    }
    digestInto(out) {
      aexists(this);
      aoutput(out, this);
      this.finished = true;
      const { buffer, view, blockLen, isLE } = this;
      let { pos } = this;
      buffer[pos++] = 128;
      clean(this.buffer.subarray(pos));
      if (this.padOffset > blockLen - pos) {
        this.process(view, 0);
        pos = 0;
      }
      for (let i = pos;i < blockLen; i++)
        buffer[i] = 0;
      view.setBigUint64(blockLen - 8, BigInt(this.length * 8), isLE);
      this.process(view, 0);
      const oview = createView(out);
      const len = this.outputLen;
      if (len % 4)
        throw new Error("_sha2: outputLen must be aligned to 32bit");
      const outLen = len / 4;
      const state = this.get();
      if (outLen > state.length)
        throw new Error("_sha2: outputLen bigger than state");
      for (let i = 0;i < outLen; i++)
        oview.setUint32(4 * i, state[i], isLE);
    }
    digest() {
      const { buffer, outputLen } = this;
      this.digestInto(buffer);
      const res = buffer.slice(0, outputLen);
      this.destroy();
      return res;
    }
    _cloneInto(to) {
      to ||= new this.constructor;
      to.set(...this.get());
      const { blockLen, buffer, length, finished, destroyed, pos } = this;
      to.destroyed = destroyed;
      to.finished = finished;
      to.length = length;
      to.pos = pos;
      if (length % blockLen)
        to.buffer.set(buffer);
      return to;
    }
    clone() {
      return this._cloneInto();
    }
  }
  var SHA256_IV = /* @__PURE__ */ Uint32Array.from([
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ]);
  var SHA512_IV = /* @__PURE__ */ Uint32Array.from([
    1779033703,
    4089235720,
    3144134277,
    2227873595,
    1013904242,
    4271175723,
    2773480762,
    1595750129,
    1359893119,
    2917565137,
    2600822924,
    725511199,
    528734635,
    4215389547,
    1541459225,
    327033209
  ]);

  // node_modules/@noble/hashes/_u64.js
  var U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
  var _32n = /* @__PURE__ */ BigInt(32);
  function fromBig(n, le = false) {
    if (le)
      return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
    return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
  }
  function split(lst, le = false) {
    const len = lst.length;
    let Ah = new Uint32Array(len);
    let Al = new Uint32Array(len);
    for (let i = 0;i < len; i++) {
      const { h, l } = fromBig(lst[i], le);
      [Ah[i], Al[i]] = [h, l];
    }
    return [Ah, Al];
  }
  var shrSH = (h, _l, s) => h >>> s;
  var shrSL = (h, l, s) => h << 32 - s | l >>> s;
  var rotrSH = (h, l, s) => h >>> s | l << 32 - s;
  var rotrSL = (h, l, s) => h << 32 - s | l >>> s;
  var rotrBH = (h, l, s) => h << 64 - s | l >>> s - 32;
  var rotrBL = (h, l, s) => h >>> s - 32 | l << 64 - s;
  function add(Ah, Al, Bh, Bl) {
    const l = (Al >>> 0) + (Bl >>> 0);
    return { h: Ah + Bh + (l / 2 ** 32 | 0) | 0, l: l | 0 };
  }
  var add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
  var add3H = (low, Ah, Bh, Ch) => Ah + Bh + Ch + (low / 2 ** 32 | 0) | 0;
  var add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
  var add4H = (low, Ah, Bh, Ch, Dh) => Ah + Bh + Ch + Dh + (low / 2 ** 32 | 0) | 0;
  var add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
  var add5H = (low, Ah, Bh, Ch, Dh, Eh) => Ah + Bh + Ch + Dh + Eh + (low / 2 ** 32 | 0) | 0;

  // node_modules/@noble/hashes/sha2.js
  var SHA256_K = /* @__PURE__ */ Uint32Array.from([
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ]);
  var SHA256_W = /* @__PURE__ */ new Uint32Array(64);

  class SHA2_32B extends HashMD {
    constructor(outputLen) {
      super(64, outputLen, 8, false);
    }
    get() {
      const { A, B, C, D, E, F, G, H } = this;
      return [A, B, C, D, E, F, G, H];
    }
    set(A, B, C, D, E, F, G, H) {
      this.A = A | 0;
      this.B = B | 0;
      this.C = C | 0;
      this.D = D | 0;
      this.E = E | 0;
      this.F = F | 0;
      this.G = G | 0;
      this.H = H | 0;
    }
    process(view, offset) {
      for (let i = 0;i < 16; i++, offset += 4)
        SHA256_W[i] = view.getUint32(offset, false);
      for (let i = 16;i < 64; i++) {
        const W15 = SHA256_W[i - 15];
        const W2 = SHA256_W[i - 2];
        const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
        const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
        SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
      }
      let { A, B, C, D, E, F, G, H } = this;
      for (let i = 0;i < 64; i++) {
        const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
        const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
        const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
        const T2 = sigma0 + Maj(A, B, C) | 0;
        H = G;
        G = F;
        F = E;
        E = D + T1 | 0;
        D = C;
        C = B;
        B = A;
        A = T1 + T2 | 0;
      }
      A = A + this.A | 0;
      B = B + this.B | 0;
      C = C + this.C | 0;
      D = D + this.D | 0;
      E = E + this.E | 0;
      F = F + this.F | 0;
      G = G + this.G | 0;
      H = H + this.H | 0;
      this.set(A, B, C, D, E, F, G, H);
    }
    roundClean() {
      clean(SHA256_W);
    }
    destroy() {
      this.set(0, 0, 0, 0, 0, 0, 0, 0);
      clean(this.buffer);
    }
  }

  class _SHA256 extends SHA2_32B {
    A = SHA256_IV[0] | 0;
    B = SHA256_IV[1] | 0;
    C = SHA256_IV[2] | 0;
    D = SHA256_IV[3] | 0;
    E = SHA256_IV[4] | 0;
    F = SHA256_IV[5] | 0;
    G = SHA256_IV[6] | 0;
    H = SHA256_IV[7] | 0;
    constructor() {
      super(32);
    }
  }
  var K512 = /* @__PURE__ */ (() => split([
    "0x428a2f98d728ae22",
    "0x7137449123ef65cd",
    "0xb5c0fbcfec4d3b2f",
    "0xe9b5dba58189dbbc",
    "0x3956c25bf348b538",
    "0x59f111f1b605d019",
    "0x923f82a4af194f9b",
    "0xab1c5ed5da6d8118",
    "0xd807aa98a3030242",
    "0x12835b0145706fbe",
    "0x243185be4ee4b28c",
    "0x550c7dc3d5ffb4e2",
    "0x72be5d74f27b896f",
    "0x80deb1fe3b1696b1",
    "0x9bdc06a725c71235",
    "0xc19bf174cf692694",
    "0xe49b69c19ef14ad2",
    "0xefbe4786384f25e3",
    "0x0fc19dc68b8cd5b5",
    "0x240ca1cc77ac9c65",
    "0x2de92c6f592b0275",
    "0x4a7484aa6ea6e483",
    "0x5cb0a9dcbd41fbd4",
    "0x76f988da831153b5",
    "0x983e5152ee66dfab",
    "0xa831c66d2db43210",
    "0xb00327c898fb213f",
    "0xbf597fc7beef0ee4",
    "0xc6e00bf33da88fc2",
    "0xd5a79147930aa725",
    "0x06ca6351e003826f",
    "0x142929670a0e6e70",
    "0x27b70a8546d22ffc",
    "0x2e1b21385c26c926",
    "0x4d2c6dfc5ac42aed",
    "0x53380d139d95b3df",
    "0x650a73548baf63de",
    "0x766a0abb3c77b2a8",
    "0x81c2c92e47edaee6",
    "0x92722c851482353b",
    "0xa2bfe8a14cf10364",
    "0xa81a664bbc423001",
    "0xc24b8b70d0f89791",
    "0xc76c51a30654be30",
    "0xd192e819d6ef5218",
    "0xd69906245565a910",
    "0xf40e35855771202a",
    "0x106aa07032bbd1b8",
    "0x19a4c116b8d2d0c8",
    "0x1e376c085141ab53",
    "0x2748774cdf8eeb99",
    "0x34b0bcb5e19b48a8",
    "0x391c0cb3c5c95a63",
    "0x4ed8aa4ae3418acb",
    "0x5b9cca4f7763e373",
    "0x682e6ff3d6b2b8a3",
    "0x748f82ee5defb2fc",
    "0x78a5636f43172f60",
    "0x84c87814a1f0ab72",
    "0x8cc702081a6439ec",
    "0x90befffa23631e28",
    "0xa4506cebde82bde9",
    "0xbef9a3f7b2c67915",
    "0xc67178f2e372532b",
    "0xca273eceea26619c",
    "0xd186b8c721c0c207",
    "0xeada7dd6cde0eb1e",
    "0xf57d4f7fee6ed178",
    "0x06f067aa72176fba",
    "0x0a637dc5a2c898a6",
    "0x113f9804bef90dae",
    "0x1b710b35131c471b",
    "0x28db77f523047d84",
    "0x32caab7b40c72493",
    "0x3c9ebe0a15c9bebc",
    "0x431d67c49c100d4c",
    "0x4cc5d4becb3e42b6",
    "0x597f299cfc657e2a",
    "0x5fcb6fab3ad6faec",
    "0x6c44198c4a475817"
  ].map((n) => BigInt(n))))();
  var SHA512_Kh = /* @__PURE__ */ (() => K512[0])();
  var SHA512_Kl = /* @__PURE__ */ (() => K512[1])();
  var SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
  var SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);

  class SHA2_64B extends HashMD {
    constructor(outputLen) {
      super(128, outputLen, 16, false);
    }
    get() {
      const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
      return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
    }
    set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
      this.Ah = Ah | 0;
      this.Al = Al | 0;
      this.Bh = Bh | 0;
      this.Bl = Bl | 0;
      this.Ch = Ch | 0;
      this.Cl = Cl | 0;
      this.Dh = Dh | 0;
      this.Dl = Dl | 0;
      this.Eh = Eh | 0;
      this.El = El | 0;
      this.Fh = Fh | 0;
      this.Fl = Fl | 0;
      this.Gh = Gh | 0;
      this.Gl = Gl | 0;
      this.Hh = Hh | 0;
      this.Hl = Hl | 0;
    }
    process(view, offset) {
      for (let i = 0;i < 16; i++, offset += 4) {
        SHA512_W_H[i] = view.getUint32(offset);
        SHA512_W_L[i] = view.getUint32(offset += 4);
      }
      for (let i = 16;i < 80; i++) {
        const W15h = SHA512_W_H[i - 15] | 0;
        const W15l = SHA512_W_L[i - 15] | 0;
        const s0h = rotrSH(W15h, W15l, 1) ^ rotrSH(W15h, W15l, 8) ^ shrSH(W15h, W15l, 7);
        const s0l = rotrSL(W15h, W15l, 1) ^ rotrSL(W15h, W15l, 8) ^ shrSL(W15h, W15l, 7);
        const W2h = SHA512_W_H[i - 2] | 0;
        const W2l = SHA512_W_L[i - 2] | 0;
        const s1h = rotrSH(W2h, W2l, 19) ^ rotrBH(W2h, W2l, 61) ^ shrSH(W2h, W2l, 6);
        const s1l = rotrSL(W2h, W2l, 19) ^ rotrBL(W2h, W2l, 61) ^ shrSL(W2h, W2l, 6);
        const SUMl = add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
        const SUMh = add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
        SHA512_W_H[i] = SUMh | 0;
        SHA512_W_L[i] = SUMl | 0;
      }
      let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
      for (let i = 0;i < 80; i++) {
        const sigma1h = rotrSH(Eh, El, 14) ^ rotrSH(Eh, El, 18) ^ rotrBH(Eh, El, 41);
        const sigma1l = rotrSL(Eh, El, 14) ^ rotrSL(Eh, El, 18) ^ rotrBL(Eh, El, 41);
        const CHIh = Eh & Fh ^ ~Eh & Gh;
        const CHIl = El & Fl ^ ~El & Gl;
        const T1ll = add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
        const T1h = add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
        const T1l = T1ll | 0;
        const sigma0h = rotrSH(Ah, Al, 28) ^ rotrBH(Ah, Al, 34) ^ rotrBH(Ah, Al, 39);
        const sigma0l = rotrSL(Ah, Al, 28) ^ rotrBL(Ah, Al, 34) ^ rotrBL(Ah, Al, 39);
        const MAJh = Ah & Bh ^ Ah & Ch ^ Bh & Ch;
        const MAJl = Al & Bl ^ Al & Cl ^ Bl & Cl;
        Hh = Gh | 0;
        Hl = Gl | 0;
        Gh = Fh | 0;
        Gl = Fl | 0;
        Fh = Eh | 0;
        Fl = El | 0;
        ({ h: Eh, l: El } = add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
        Dh = Ch | 0;
        Dl = Cl | 0;
        Ch = Bh | 0;
        Cl = Bl | 0;
        Bh = Ah | 0;
        Bl = Al | 0;
        const All = add3L(T1l, sigma0l, MAJl);
        Ah = add3H(All, T1h, sigma0h, MAJh);
        Al = All | 0;
      }
      ({ h: Ah, l: Al } = add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
      ({ h: Bh, l: Bl } = add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
      ({ h: Ch, l: Cl } = add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
      ({ h: Dh, l: Dl } = add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
      ({ h: Eh, l: El } = add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
      ({ h: Fh, l: Fl } = add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
      ({ h: Gh, l: Gl } = add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
      ({ h: Hh, l: Hl } = add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
      this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
    }
    roundClean() {
      clean(SHA512_W_H, SHA512_W_L);
    }
    destroy() {
      clean(this.buffer);
      this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }
  }

  class _SHA512 extends SHA2_64B {
    Ah = SHA512_IV[0] | 0;
    Al = SHA512_IV[1] | 0;
    Bh = SHA512_IV[2] | 0;
    Bl = SHA512_IV[3] | 0;
    Ch = SHA512_IV[4] | 0;
    Cl = SHA512_IV[5] | 0;
    Dh = SHA512_IV[6] | 0;
    Dl = SHA512_IV[7] | 0;
    Eh = SHA512_IV[8] | 0;
    El = SHA512_IV[9] | 0;
    Fh = SHA512_IV[10] | 0;
    Fl = SHA512_IV[11] | 0;
    Gh = SHA512_IV[12] | 0;
    Gl = SHA512_IV[13] | 0;
    Hh = SHA512_IV[14] | 0;
    Hl = SHA512_IV[15] | 0;
    constructor() {
      super(64);
    }
  }
  var sha256 = /* @__PURE__ */ createHasher(() => new _SHA256, /* @__PURE__ */ oidNist(1));
  var sha512 = /* @__PURE__ */ createHasher(() => new _SHA512, /* @__PURE__ */ oidNist(3));

  // src/release/verify.ts
  hashes.sha512 = (message) => Uint8Array.from(sha512(message));
  function base64ToBytes(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0;index < binary.length; index++)
      bytes[index] = binary.charCodeAt(index);
    return bytes;
  }
  function bytesToBase64(bytes) {
    let binary = "";
    for (let index = 0;index < bytes.length; index += 32768)
      binary += String.fromCharCode(...bytes.subarray(index, index + 32768));
    return btoa(binary);
  }
  function utf8(text) {
    return new TextEncoder().encode(text);
  }
  function sha256Hex(bytes) {
    const digest = sha256(bytes);
    let hex = "";
    for (const byte of digest)
      hex += byte.toString(16).padStart(2, "0");
    return hex;
  }
  function verifyManifest(manifestText, signatureText, trustedKeys, expectedName) {
    const signature = parseSignature(signatureText);
    const key = trustedKeys.find((candidate) => candidate.id === signature.keyId);
    if (!key)
      throw new Error(`Manifest signed by untrusted key ${signature.keyId}`);
    const publicKey = base64ToBytes(key.publicKey);
    if (publicKey.length !== 32)
      throw new Error(`Pinned key ${key.id} is not an Ed25519 public key`);
    let valid = false;
    try {
      valid = verify(base64ToBytes(signature.signature), utf8(manifestText), publicKey);
    } catch {
      valid = false;
    }
    if (!valid)
      throw new Error("Manifest signature verification failed");
    let parsed;
    try {
      parsed = JSON.parse(manifestText);
    } catch {
      throw new Error("Signed manifest is not valid JSON");
    }
    return { manifest: validateManifest(parsed, expectedName), signature };
  }
  function verifyArtifact(bytes, entry) {
    if (bytes.length !== entry.size)
      throw new Error(`Artifact ${entry.path} size mismatch: expected ${entry.size}, got ${bytes.length}`);
    const actual = sha256Hex(bytes);
    if (actual !== entry.sha256)
      throw new Error(`Artifact ${entry.path} SHA-256 mismatch`);
  }

  // src/loader/core.ts
  var RELEASE_STORAGE_KEY = "kgm.loader.release.v1";
  var FLOOR_STORAGE_KEY = "kgm.loader.trusted-version.v1";
  var decoder = new TextDecoder("utf-8", { fatal: true });
  function message(error) {
    return error instanceof Error ? error.message : String(error);
  }
  function startRelease(env, release, source) {
    try {
      env.start(release);
    } catch (error) {
      env.report({ kind: "start-failed", version: release.manifest.version, reason: message(error) });
      return;
    }
    env.report({ kind: "started", version: release.manifest.version, source });
  }
  function readFloor(env) {
    const value = env.getValue(FLOOR_STORAGE_KEY);
    return isSemVer(value) ? value : null;
  }
  function readCache(env) {
    const value = env.getValue(RELEASE_STORAGE_KEY);
    if (!value || typeof value !== "object")
      return null;
    const cache = value;
    if (typeof cache.manifest !== "string" || typeof cache.signature !== "string" || typeof cache.application !== "string" || cache.core !== undefined && typeof cache.core !== "string")
      return null;
    return cache;
  }
  function verifyCachedRelease(config, cache, floor) {
    const { manifest } = verifyManifest(cache.manifest, cache.signature, config.trustedKeys, config.appName);
    if (floor && compareSemVer(manifest.version, floor) < 0)
      throw new Error(`Cached release ${manifest.version} is older than trusted ${floor}`);
    if (compareSemVer(config.loaderVersion, manifest.minLoaderVersion) < 0)
      throw new Error(`Cached release needs loader ${manifest.minLoaderVersion}`);
    verifyArtifact(utf8(cache.application), manifest.artifacts.application);
    let core;
    if (manifest.artifacts.core) {
      if (!cache.core)
        throw new Error("Cached release is missing its WebAssembly module");
      core = base64ToBytes(cache.core);
      verifyArtifact(core, manifest.artifacts.core);
    }
    return { manifest, application: cache.application, core };
  }
  function startFromCache(config, env) {
    const cache = readCache(env);
    if (!cache)
      return null;
    let release;
    try {
      release = verifyCachedRelease(config, cache, readFloor(env));
    } catch (error) {
      env.deleteValue(RELEASE_STORAGE_KEY);
      env.report({ kind: "cache-rejected", reason: message(error) });
      return null;
    }
    startRelease(env, release, "cache");
    return release;
  }
  async function fetchVerifiedRemote(config, env) {
    const manifestText = decoder.decode(await env.fetchBytes(`${config.baseUrl}latest/manifest.json`));
    let claimed;
    try {
      claimed = JSON.parse(manifestText).version;
    } catch {
      throw new Error("Latest manifest is not valid JSON");
    }
    if (!isSemVer(claimed))
      throw new Error("Latest manifest has no valid version");
    const signatureText = decoder.decode(await env.fetchBytes(`${config.baseUrl}${releaseDirectory(claimed)}signatures/manifest.sig`));
    const { manifest } = verifyManifest(manifestText, signatureText, config.trustedKeys, config.appName);
    if (manifest.version !== claimed)
      throw new Error("Manifest version changed during verification");
    return { manifest, manifestText, signatureText };
  }
  async function downloadRelease(config, env, manifest) {
    const applicationBytes = await env.fetchBytes(config.baseUrl + manifest.artifacts.application.path);
    verifyArtifact(applicationBytes, manifest.artifacts.application);
    let core;
    if (manifest.artifacts.core) {
      core = await env.fetchBytes(config.baseUrl + manifest.artifacts.core.path);
      verifyArtifact(core, manifest.artifacts.core);
    }
    return { application: decoder.decode(applicationBytes), core };
  }
  async function checkForUpdate(config, env, running) {
    try {
      const { manifest, manifestText, signatureText } = await fetchVerifiedRemote(config, env);
      const cachedVersion = running?.manifest.version;
      if (cachedVersion && manifest.revoked.includes(cachedVersion)) {
        env.deleteValue(RELEASE_STORAGE_KEY);
        env.report({ kind: "revoked", version: cachedVersion });
      }
      const floor = readFloor(env);
      const decision = decideUpdate(manifest, floor, config.loaderVersion);
      if (decision.action === "reject-loader") {
        env.report({ kind: "loader-outdated", required: decision.required });
        return null;
      }
      if (decision.action === "reject-downgrade") {
        env.report({ kind: "downgrade-rejected", remote: manifest.version, trusted: floor });
        return null;
      }
      const revokedRunning = cachedVersion !== undefined && manifest.revoked.includes(cachedVersion);
      if (decision.action === "current" && running && !revokedRunning)
        return null;
      const downloaded = await downloadRelease(config, env, manifest);
      const cache = {
        manifest: manifestText,
        signature: signatureText,
        application: downloaded.application,
        ...downloaded.core ? { core: bytesToBase64(downloaded.core) } : {}
      };
      env.setValue(RELEASE_STORAGE_KEY, cache);
      env.setValue(FLOOR_STORAGE_KEY, manifest.version);
      const release = { manifest, ...downloaded };
      if (running) {
        env.report({ kind: "update-ready", version: manifest.version });
        return null;
      }
      startRelease(env, release, "network");
      return release;
    } catch (error) {
      env.report({ kind: "update-failed", reason: message(error), running: running !== null });
      return null;
    }
  }
  function runLoader(config, env) {
    const running = startFromCache(config, env);
    return checkForUpdate(config, env, running);
  }

  // src/loader/main.ts
  var config = { appName: "kglacer-macro", loaderVersion: "7.0.0", baseUrl: "https://releases.robertogallardo.dev/", trustedKeys: [{ id: "kgm-2026-11", publicKey: "HqWHYeNNoZZBVj1yACwzyMVRvZXCzbdf6Zzwr4umjo8=" }] };
  var LOG_PREFIX = "[KGM][Loader]";
  var REQUEST_TIMEOUT_MS = 20000;
  var ONCE_FLAG = Symbol.for("kglacer-macro.loader.started");
  var spanish = /^es\b/i.test(navigator.language || "");
  var text = {
    updateReady: (version) => spanish ? `KGlacerMacro ${version} está listo. Recarga la página para usarlo.` : `KGlacerMacro ${version} is ready. Reload the page to use it.`,
    loaderOutdated: (version) => spanish ? `Esta versión necesita el loader ${version} o posterior. Actualiza el script en Tampermonkey.` : `This release needs loader ${version} or newer. Update the script in Tampermonkey.`,
    unavailable: spanish ? "No se pudo verificar ni descargar KGlacerMacro. No se ejecutó código sin verificar. Revisa tu conexión y recarga." : "KGlacerMacro could not be verified or downloaded. No unverified code was run. Check your connection and reload.",
    downgrade: spanish ? "Se rechazó una versión anterior a la ya instalada. Se mantiene la versión verificada." : "An older release than the installed one was rejected. The verified release stays in use.",
    revoked: spanish ? "La versión en caché fue retirada. Recarga la página para instalar la versión actual." : "The cached release was withdrawn. Reload the page to install the current release."
  };
  function fetchBytes(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url,
        responseType: "arraybuffer",
        timeout: REQUEST_TIMEOUT_MS,
        nocache: true,
        onload: (response) => response.status >= 200 && response.status < 300 ? resolve(new Uint8Array(response.response)) : reject(new Error(`HTTP ${response.status} for ${url}`)),
        onerror: () => reject(new Error(`Network error for ${url}`)),
        ontimeout: () => reject(new Error(`Timed out after ${REQUEST_TIMEOUT_MS} ms for ${url}`))
      });
    });
  }
  function start(release) {
    const scope = globalThis;
    if (scope[ONCE_FLAG])
      throw new Error("Application already started in this page");
    scope[ONCE_FLAG] = release.manifest.version;
    const grants = {
      GM_info: typeof GM_info === "undefined" ? undefined : GM_info,
      GM: typeof GM === "undefined" ? undefined : GM,
      GM_cookie: typeof GM_cookie === "undefined" ? undefined : GM_cookie,
      unsafeWindow: typeof unsafeWindow === "undefined" ? window : unsafeWindow
    };
    const names = ["window", "self", "globalThis", "unsafeWindow", "GM_info", "GM", "GM_cookie", "KGM_GRANTS", "KGM_CORE_WASM"];
    const values = [window, self, globalThis, grants.unsafeWindow, grants.GM_info, grants.GM, grants.GM_cookie, grants, release.core];
    const run = new Function(...names, `${release.application}
//# sourceURL=kglacer-macro-${release.manifest.version}.js`);
    run.apply(undefined, values);
  }
  function notify(message, tone) {
    const show = () => {
      const box = document.createElement("div");
      box.setAttribute("role", tone === "error" ? "alert" : "status");
      box.textContent = message;
      box.style.cssText = [
        "position:fixed",
        "left:16px",
        "bottom:16px",
        "z-index:2147483647",
        "max-width:360px",
        "padding:10px 14px",
        "border-radius:8px",
        "font:13px/1.4 system-ui,sans-serif",
        "color:#fff",
        `background:${tone === "error" ? "#b91c1c" : "#1d4ed8"}`,
        "box-shadow:0 4px 16px rgb(0 0 0 / 30%)",
        "cursor:pointer"
      ].join(";");
      box.addEventListener("click", () => box.remove());
      document.body.append(box);
      if (tone === "info")
        setTimeout(() => box.remove(), 12000);
    };
    if (document.body)
      show();
    else
      document.addEventListener("DOMContentLoaded", show, { once: true });
  }
  function report(event) {
    switch (event.kind) {
      case "started":
        console.info(`${LOG_PREFIX} Started ${event.version} from ${event.source}`);
        return;
      case "update-ready":
        console.info(`${LOG_PREFIX} Verified update ${event.version} stored for the next load`);
        notify(text.updateReady(event.version), "info");
        return;
      case "cache-rejected":
        console.warn(`${LOG_PREFIX} Cached release rejected: ${event.reason}`);
        return;
      case "revoked":
        console.warn(`${LOG_PREFIX} Cached release ${event.version} was revoked`);
        notify(text.revoked, "info");
        return;
      case "loader-outdated":
        console.error(`${LOG_PREFIX} Release requires loader ${event.required}`);
        notify(text.loaderOutdated(event.required), "error");
        return;
      case "downgrade-rejected":
        console.error(`${LOG_PREFIX} Rejected ${event.remote}; trusted version is ${event.trusted}`);
        notify(text.downgrade, "error");
        return;
      case "start-failed":
        console.error(`${LOG_PREFIX} Release ${event.version} failed to start: ${event.reason}`);
        return;
      case "update-failed":
        console.error(`${LOG_PREFIX} Release check failed: ${event.reason}`);
        if (!event.running)
          notify(text.unavailable, "error");
    }
  }
  runLoader(config, {
    getValue: (key) => GM_getValue(key),
    setValue: (key, value) => GM_setValue(key, value),
    deleteValue: (key) => GM_deleteValue(key),
    fetchBytes,
    start,
    report
  });
})();
