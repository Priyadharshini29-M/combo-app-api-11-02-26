var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value,
      })
    : (obj[key] = value);
var __commonJS = (cb, mod) =>
  function __require() {
    return (
      mod ||
        (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod),
      mod.exports
    );
  };
var __copyProps = (to, from, except, desc) => {
  if ((from && typeof from === 'object') || typeof from === 'function') {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: () => from[key],
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
        });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (
  (target = mod != null ? __create(__getProtoOf(mod)) : {}),
  __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule
      ? __defProp(target, 'default', { value: mod, enumerable: true })
      : target,
    mod
  )
);
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
  return value;
};

// node_modules/compare-versions/lib/umd/index.js
var require_umd = __commonJS({
  'node_modules/compare-versions/lib/umd/index.js'(exports, module) {
    (function (global, factory) {
      typeof exports === 'object' && typeof module !== 'undefined'
        ? factory(exports)
        : typeof define === 'function' && define.amd
          ? define(['exports'], factory)
          : ((global =
              typeof globalThis !== 'undefined' ? globalThis : global || self),
            factory((global.compareVersions = {})));
    })(exports, function (exports2) {
      'use strict';
      const semver2 =
        /^[v^~<>=]*?(\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+))?(?:-([\da-z\-]+(?:\.[\da-z\-]+)*))?(?:\+[\da-z\-]+(?:\.[\da-z\-]+)*)?)?)?$/i;
      const validateAndParse = (version) => {
        if (typeof version !== 'string') {
          throw new TypeError('Invalid argument expected string');
        }
        const match = version.match(semver2);
        if (!match) {
          throw new Error(
            `Invalid argument not valid semver ('${version}' received)`
          );
        }
        match.shift();
        return match;
      };
      const isWildcard = (s) => s === '*' || s === 'x' || s === 'X';
      const tryParse = (v) => {
        const n = parseInt(v, 10);
        return isNaN(n) ? v : n;
      };
      const forceType = (a, b) =>
        typeof a !== typeof b ? [String(a), String(b)] : [a, b];
      const compareStrings = (a, b) => {
        if (isWildcard(a) || isWildcard(b)) return 0;
        const [ap, bp] = forceType(tryParse(a), tryParse(b));
        if (ap > bp) return 1;
        if (ap < bp) return -1;
        return 0;
      };
      const compareSegments = (a, b) => {
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
          const r = compareStrings(a[i] || '0', b[i] || '0');
          if (r !== 0) return r;
        }
        return 0;
      };
      const compareVersions = (v1, v2) => {
        const n1 = validateAndParse(v1);
        const n2 = validateAndParse(v2);
        const p1 = n1.pop();
        const p2 = n2.pop();
        const r = compareSegments(n1, n2);
        if (r !== 0) return r;
        if (p1 && p2) {
          return compareSegments(p1.split('.'), p2.split('.'));
        } else if (p1 || p2) {
          return p1 ? -1 : 1;
        }
        return 0;
      };
      const compare2 = (v1, v2, operator) => {
        assertValidOperator(operator);
        const res = compareVersions(v1, v2);
        return operatorResMap[operator].includes(res);
      };
      const operatorResMap = {
        '>': [1],
        '>=': [0, 1],
        '=': [0],
        '<=': [-1, 0],
        '<': [-1],
        '!=': [-1, 1],
      };
      const allowedOperators = Object.keys(operatorResMap);
      const assertValidOperator = (op) => {
        if (typeof op !== 'string') {
          throw new TypeError(
            `Invalid operator type, expected string but got ${typeof op}`
          );
        }
        if (allowedOperators.indexOf(op) === -1) {
          throw new Error(
            `Invalid operator, expected one of ${allowedOperators.join('|')}`
          );
        }
      };
      const satisfies = (version, range) => {
        range = range.replace(/([><=]+)\s+/g, '$1');
        if (range.includes('||')) {
          return range.split('||').some((r4) => satisfies(version, r4));
        } else if (range.includes(' - ')) {
          const [a, b] = range.split(' - ', 2);
          return satisfies(version, `>=${a} <=${b}`);
        } else if (range.includes(' ')) {
          return range
            .trim()
            .replace(/\s{2,}/g, ' ')
            .split(' ')
            .every((r4) => satisfies(version, r4));
        }
        const m = range.match(/^([<>=~^]+)/);
        const op = m ? m[1] : '=';
        if (op !== '^' && op !== '~') return compare2(version, range, op);
        const [v1, v2, v3, , vp] = validateAndParse(version);
        const [r1, r2, r3, , rp] = validateAndParse(range);
        const v = [v1, v2, v3];
        const r = [
          r1,
          r2 !== null && r2 !== void 0 ? r2 : 'x',
          r3 !== null && r3 !== void 0 ? r3 : 'x',
        ];
        if (rp) {
          if (!vp) return false;
          if (compareSegments(v, r) !== 0) return false;
          if (compareSegments(vp.split('.'), rp.split('.')) === -1)
            return false;
        }
        const nonZero = r.findIndex((v5) => v5 !== '0') + 1;
        const i = op === '~' ? 2 : nonZero > 1 ? nonZero : 1;
        if (compareSegments(v.slice(0, i), r.slice(0, i)) !== 0) return false;
        if (compareSegments(v.slice(i), r.slice(i)) === -1) return false;
        return true;
      };
      const validate = (version) =>
        typeof version === 'string' &&
        /^[v\d]/.test(version) &&
        semver2.test(version);
      const validateStrict = (version) =>
        typeof version === 'string' &&
        /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/.test(
          version
        );
      exports2.compare = compare2;
      exports2.compareVersions = compareVersions;
      exports2.satisfies = satisfies;
      exports2.validate = validate;
      exports2.validateStrict = validateStrict;
    });
  },
});

// node_modules/semver/internal/constants.js
var require_constants = __commonJS({
  'node_modules/semver/internal/constants.js'(exports, module) {
    'use strict';
    var SEMVER_SPEC_VERSION = '2.0.0';
    var MAX_LENGTH = 256;
    var MAX_SAFE_INTEGER =
      Number.MAX_SAFE_INTEGER /* istanbul ignore next */ || 9007199254740991;
    var MAX_SAFE_COMPONENT_LENGTH = 16;
    var MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
    var RELEASE_TYPES = [
      'major',
      'premajor',
      'minor',
      'preminor',
      'patch',
      'prepatch',
      'prerelease',
    ];
    module.exports = {
      MAX_LENGTH,
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_SAFE_INTEGER,
      RELEASE_TYPES,
      SEMVER_SPEC_VERSION,
      FLAG_INCLUDE_PRERELEASE: 1,
      FLAG_LOOSE: 2,
    };
  },
});

// node_modules/semver/internal/debug.js
var require_debug = __commonJS({
  'node_modules/semver/internal/debug.js'(exports, module) {
    'use strict';
    var debug =
      typeof process === 'object' &&
      process.env &&
      process.env.NODE_DEBUG &&
      /\bsemver\b/i.test(process.env.NODE_DEBUG)
        ? (...args) => console.error('SEMVER', ...args)
        : () => {};
    module.exports = debug;
  },
});

// node_modules/semver/internal/re.js
var require_re = __commonJS({
  'node_modules/semver/internal/re.js'(exports, module) {
    'use strict';
    var { MAX_SAFE_COMPONENT_LENGTH, MAX_SAFE_BUILD_LENGTH, MAX_LENGTH } =
      require_constants();
    var debug = require_debug();
    exports = module.exports = {};
    var re = (exports.re = []);
    var safeRe = (exports.safeRe = []);
    var src = (exports.src = []);
    var safeSrc = (exports.safeSrc = []);
    var t = (exports.t = {});
    var R = 0;
    var LETTERDASHNUMBER = '[a-zA-Z0-9-]';
    var safeRegexReplacements = [
      ['\\s', 1],
      ['\\d', MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH],
    ];
    var makeSafeRegex = (value) => {
      for (const [token, max] of safeRegexReplacements) {
        value = value
          .split(`${token}*`)
          .join(`${token}{0,${max}}`)
          .split(`${token}+`)
          .join(`${token}{1,${max}}`);
      }
      return value;
    };
    var createToken = (name, value, isGlobal) => {
      const safe = makeSafeRegex(value);
      const index = R++;
      debug(name, index, value);
      t[name] = index;
      src[index] = value;
      safeSrc[index] = safe;
      re[index] = new RegExp(value, isGlobal ? 'g' : void 0);
      safeRe[index] = new RegExp(safe, isGlobal ? 'g' : void 0);
    };
    createToken('NUMERICIDENTIFIER', '0|[1-9]\\d*');
    createToken('NUMERICIDENTIFIERLOOSE', '\\d+');
    createToken('NONNUMERICIDENTIFIER', `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken(
      'MAINVERSION',
      `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`
    );
    createToken(
      'MAINVERSIONLOOSE',
      `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`
    );
    createToken(
      'PRERELEASEIDENTIFIER',
      `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`
    );
    createToken(
      'PRERELEASEIDENTIFIERLOOSE',
      `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`
    );
    createToken(
      'PRERELEASE',
      `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`
    );
    createToken(
      'PRERELEASELOOSE',
      `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`
    );
    createToken('BUILDIDENTIFIER', `${LETTERDASHNUMBER}+`);
    createToken(
      'BUILD',
      `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`
    );
    createToken(
      'FULLPLAIN',
      `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`
    );
    createToken('FULL', `^${src[t.FULLPLAIN]}$`);
    createToken(
      'LOOSEPLAIN',
      `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`
    );
    createToken('LOOSE', `^${src[t.LOOSEPLAIN]}$`);
    createToken('GTLT', '((?:<|>)?=?)');
    createToken(
      'XRANGEIDENTIFIERLOOSE',
      `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`
    );
    createToken('XRANGEIDENTIFIER', `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken(
      'XRANGEPLAIN',
      `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`
    );
    createToken(
      'XRANGEPLAINLOOSE',
      `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`
    );
    createToken('XRANGE', `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken(
      'XRANGELOOSE',
      `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`
    );
    createToken(
      'COERCEPLAIN',
      `${'(^|[^\\d])(\\d{1,'}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`
    );
    createToken('COERCE', `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken(
      'COERCEFULL',
      src[t.COERCEPLAIN] +
        `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`
    );
    createToken('COERCERTL', src[t.COERCE], true);
    createToken('COERCERTLFULL', src[t.COERCEFULL], true);
    createToken('LONETILDE', '(?:~>?)');
    createToken('TILDETRIM', `(\\s*)${src[t.LONETILDE]}\\s+`, true);
    exports.tildeTrimReplace = '$1~';
    createToken('TILDE', `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken(
      'TILDELOOSE',
      `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`
    );
    createToken('LONECARET', '(?:\\^)');
    createToken('CARETTRIM', `(\\s*)${src[t.LONECARET]}\\s+`, true);
    exports.caretTrimReplace = '$1^';
    createToken('CARET', `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken(
      'CARETLOOSE',
      `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`
    );
    createToken(
      'COMPARATORLOOSE',
      `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`
    );
    createToken('COMPARATOR', `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    createToken(
      'COMPARATORTRIM',
      `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`,
      true
    );
    exports.comparatorTrimReplace = '$1$2$3';
    createToken(
      'HYPHENRANGE',
      `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`
    );
    createToken(
      'HYPHENRANGELOOSE',
      `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`
    );
    createToken('STAR', '(<|>)?=?\\s*\\*');
    createToken('GTE0', '^\\s*>=\\s*0\\.0\\.0\\s*$');
    createToken('GTE0PRE', '^\\s*>=\\s*0\\.0\\.0-0\\s*$');
  },
});

// node_modules/semver/internal/parse-options.js
var require_parse_options = __commonJS({
  'node_modules/semver/internal/parse-options.js'(exports, module) {
    'use strict';
    var looseOption = Object.freeze({ loose: true });
    var emptyOpts = Object.freeze({});
    var parseOptions = (options) => {
      if (!options) {
        return emptyOpts;
      }
      if (typeof options !== 'object') {
        return looseOption;
      }
      return options;
    };
    module.exports = parseOptions;
  },
});

// node_modules/semver/internal/identifiers.js
var require_identifiers = __commonJS({
  'node_modules/semver/internal/identifiers.js'(exports, module) {
    'use strict';
    var numeric = /^[0-9]+$/;
    var compareIdentifiers = (a, b) => {
      if (typeof a === 'number' && typeof b === 'number') {
        return a === b ? 0 : a < b ? -1 : 1;
      }
      const anum = numeric.test(a);
      const bnum = numeric.test(b);
      if (anum && bnum) {
        a = +a;
        b = +b;
      }
      return a === b
        ? 0
        : anum && !bnum
          ? -1
          : bnum && !anum
            ? 1
            : a < b
              ? -1
              : 1;
    };
    var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
    module.exports = {
      compareIdentifiers,
      rcompareIdentifiers,
    };
  },
});

// node_modules/semver/classes/semver.js
var require_semver = __commonJS({
  'node_modules/semver/classes/semver.js'(exports, module) {
    'use strict';
    var debug = require_debug();
    var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
    var { safeRe: re, t } = require_re();
    var parseOptions = require_parse_options();
    var { compareIdentifiers } = require_identifiers();
    var SemVer = class {
      constructor(version, options) {
        options = parseOptions(options);
        if (version instanceof SemVer) {
          if (
            version.loose === !!options.loose &&
            version.includePrerelease === !!options.includePrerelease
          ) {
            return version;
          } else {
            version = version.version;
          }
        } else if (typeof version !== 'string') {
          throw new TypeError(
            `Invalid version. Must be a string. Got type "${typeof version}".`
          );
        }
        if (version.length > MAX_LENGTH) {
          throw new TypeError(
            `version is longer than ${MAX_LENGTH} characters`
          );
        }
        debug('SemVer', version, options);
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        const m = version
          .trim()
          .match(options.loose ? re[t.LOOSE] : re[t.FULL]);
        if (!m) {
          throw new TypeError(`Invalid Version: ${version}`);
        }
        this.raw = version;
        this.major = +m[1];
        this.minor = +m[2];
        this.patch = +m[3];
        if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
          throw new TypeError('Invalid major version');
        }
        if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
          throw new TypeError('Invalid minor version');
        }
        if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
          throw new TypeError('Invalid patch version');
        }
        if (!m[4]) {
          this.prerelease = [];
        } else {
          this.prerelease = m[4].split('.').map((id) => {
            if (/^[0-9]+$/.test(id)) {
              const num = +id;
              if (num >= 0 && num < MAX_SAFE_INTEGER) {
                return num;
              }
            }
            return id;
          });
        }
        this.build = m[5] ? m[5].split('.') : [];
        this.format();
      }
      format() {
        this.version = `${this.major}.${this.minor}.${this.patch}`;
        if (this.prerelease.length) {
          this.version += `-${this.prerelease.join('.')}`;
        }
        return this.version;
      }
      toString() {
        return this.version;
      }
      compare(other) {
        debug('SemVer.compare', this.version, this.options, other);
        if (!(other instanceof SemVer)) {
          if (typeof other === 'string' && other === this.version) {
            return 0;
          }
          other = new SemVer(other, this.options);
        }
        if (other.version === this.version) {
          return 0;
        }
        return this.compareMain(other) || this.comparePre(other);
      }
      compareMain(other) {
        if (!(other instanceof SemVer)) {
          other = new SemVer(other, this.options);
        }
        if (this.major < other.major) {
          return -1;
        }
        if (this.major > other.major) {
          return 1;
        }
        if (this.minor < other.minor) {
          return -1;
        }
        if (this.minor > other.minor) {
          return 1;
        }
        if (this.patch < other.patch) {
          return -1;
        }
        if (this.patch > other.patch) {
          return 1;
        }
        return 0;
      }
      comparePre(other) {
        if (!(other instanceof SemVer)) {
          other = new SemVer(other, this.options);
        }
        if (this.prerelease.length && !other.prerelease.length) {
          return -1;
        } else if (!this.prerelease.length && other.prerelease.length) {
          return 1;
        } else if (!this.prerelease.length && !other.prerelease.length) {
          return 0;
        }
        let i = 0;
        do {
          const a = this.prerelease[i];
          const b = other.prerelease[i];
          debug('prerelease compare', i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      compareBuild(other) {
        if (!(other instanceof SemVer)) {
          other = new SemVer(other, this.options);
        }
        let i = 0;
        do {
          const a = this.build[i];
          const b = other.build[i];
          debug('build compare', i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      // preminor will bump the version up to the next minor release, and immediately
      // down to pre-release. premajor and prepatch work the same way.
      inc(release, identifier, identifierBase) {
        if (release.startsWith('pre')) {
          if (!identifier && identifierBase === false) {
            throw new Error('invalid increment argument: identifier is empty');
          }
          if (identifier) {
            const match = `-${identifier}`.match(
              this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE]
            );
            if (!match || match[1] !== identifier) {
              throw new Error(`invalid identifier: ${identifier}`);
            }
          }
        }
        switch (release) {
          case 'premajor':
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor = 0;
            this.major++;
            this.inc('pre', identifier, identifierBase);
            break;
          case 'preminor':
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor++;
            this.inc('pre', identifier, identifierBase);
            break;
          case 'prepatch':
            this.prerelease.length = 0;
            this.inc('patch', identifier, identifierBase);
            this.inc('pre', identifier, identifierBase);
            break;
          case 'prerelease':
            if (this.prerelease.length === 0) {
              this.inc('patch', identifier, identifierBase);
            }
            this.inc('pre', identifier, identifierBase);
            break;
          case 'release':
            if (this.prerelease.length === 0) {
              throw new Error(`version ${this.raw} is not a prerelease`);
            }
            this.prerelease.length = 0;
            break;
          case 'major':
            if (
              this.minor !== 0 ||
              this.patch !== 0 ||
              this.prerelease.length === 0
            ) {
              this.major++;
            }
            this.minor = 0;
            this.patch = 0;
            this.prerelease = [];
            break;
          case 'minor':
            if (this.patch !== 0 || this.prerelease.length === 0) {
              this.minor++;
            }
            this.patch = 0;
            this.prerelease = [];
            break;
          case 'patch':
            if (this.prerelease.length === 0) {
              this.patch++;
            }
            this.prerelease = [];
            break;
          case 'pre': {
            const base = Number(identifierBase) ? 1 : 0;
            if (this.prerelease.length === 0) {
              this.prerelease = [base];
            } else {
              let i = this.prerelease.length;
              while (--i >= 0) {
                if (typeof this.prerelease[i] === 'number') {
                  this.prerelease[i]++;
                  i = -2;
                }
              }
              if (i === -1) {
                if (
                  identifier === this.prerelease.join('.') &&
                  identifierBase === false
                ) {
                  throw new Error(
                    'invalid increment argument: identifier already exists'
                  );
                }
                this.prerelease.push(base);
              }
            }
            if (identifier) {
              let prerelease = [identifier, base];
              if (identifierBase === false) {
                prerelease = [identifier];
              }
              if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
                if (isNaN(this.prerelease[1])) {
                  this.prerelease = prerelease;
                }
              } else {
                this.prerelease = prerelease;
              }
            }
            break;
          }
          default:
            throw new Error(`invalid increment argument: ${release}`);
        }
        this.raw = this.format();
        if (this.build.length) {
          this.raw += `+${this.build.join('.')}`;
        }
        return this;
      }
    };
    module.exports = SemVer;
  },
});

// node_modules/semver/functions/parse.js
var require_parse = __commonJS({
  'node_modules/semver/functions/parse.js'(exports, module) {
    'use strict';
    var SemVer = require_semver();
    var parse2 = (version, options, throwErrors = false) => {
      if (version instanceof SemVer) {
        return version;
      }
      try {
        return new SemVer(version, options);
      } catch (er) {
        if (!throwErrors) {
          return null;
        }
        throw er;
      }
    };
    module.exports = parse2;
  },
});

// node_modules/semver/functions/valid.js
var require_valid = __commonJS({
  'node_modules/semver/functions/valid.js'(exports, module) {
    'use strict';
    var parse2 = require_parse();
    var valid = (version, options) => {
      const v = parse2(version, options);
      return v ? v.version : null;
    };
    module.exports = valid;
  },
});

// node_modules/semver/functions/clean.js
var require_clean = __commonJS({
  'node_modules/semver/functions/clean.js'(exports, module) {
    'use strict';
    var parse2 = require_parse();
    var clean = (version, options) => {
      const s = parse2(version.trim().replace(/^[=v]+/, ''), options);
      return s ? s.version : null;
    };
    module.exports = clean;
  },
});

// node_modules/semver/functions/inc.js
var require_inc = __commonJS({
  'node_modules/semver/functions/inc.js'(exports, module) {
    'use strict';
    var SemVer = require_semver();
    var inc = (version, release, options, identifier, identifierBase) => {
      if (typeof options === 'string') {
        identifierBase = identifier;
        identifier = options;
        options = void 0;
      }
      try {
        return new SemVer(
          version instanceof SemVer ? version.version : version,
          options
        ).inc(release, identifier, identifierBase).version;
      } catch (er) {
        return null;
      }
    };
    module.exports = inc;
  },
});

// node_modules/semver/functions/diff.js
var require_diff = __commonJS({
  'node_modules/semver/functions/diff.js'(exports, module) {
    'use strict';
    var parse2 = require_parse();
    var diff = (version1, version2) => {
      const v1 = parse2(version1, null, true);
      const v2 = parse2(version2, null, true);
      const comparison = v1.compare(v2);
      if (comparison === 0) {
        return null;
      }
      const v1Higher = comparison > 0;
      const highVersion = v1Higher ? v1 : v2;
      const lowVersion = v1Higher ? v2 : v1;
      const highHasPre = !!highVersion.prerelease.length;
      const lowHasPre = !!lowVersion.prerelease.length;
      if (lowHasPre && !highHasPre) {
        if (!lowVersion.patch && !lowVersion.minor) {
          return 'major';
        }
        if (lowVersion.compareMain(highVersion) === 0) {
          if (lowVersion.minor && !lowVersion.patch) {
            return 'minor';
          }
          return 'patch';
        }
      }
      const prefix = highHasPre ? 'pre' : '';
      if (v1.major !== v2.major) {
        return prefix + 'major';
      }
      if (v1.minor !== v2.minor) {
        return prefix + 'minor';
      }
      if (v1.patch !== v2.patch) {
        return prefix + 'patch';
      }
      return 'prerelease';
    };
    module.exports = diff;
  },
});

// node_modules/semver/functions/major.js
var require_major = __commonJS({
  'node_modules/semver/functions/major.js'(exports, module) {
    'use strict';
    var SemVer = require_semver();
    var major = (a, loose) => new SemVer(a, loose).major;
    module.exports = major;
  },
});

// node_modules/semver/functions/minor.js
var require_minor = __commonJS({
  'node_modules/semver/functions/minor.js'(exports, module) {
    'use strict';
    var SemVer = require_semver();
    var minor = (a, loose) => new SemVer(a, loose).minor;
    module.exports = minor;
  },
});

// node_modules/semver/functions/patch.js
var require_patch = __commonJS({
  'node_modules/semver/functions/patch.js'(exports, module) {
    'use strict';
    var SemVer = require_semver();
    var patch = (a, loose) => new SemVer(a, loose).patch;
    module.exports = patch;
  },
});

// node_modules/semver/functions/prerelease.js
var require_prerelease = __commonJS({
  'node_modules/semver/functions/prerelease.js'(exports, module) {
    'use strict';
    var parse2 = require_parse();
    var prerelease = (version, options) => {
      const parsed = parse2(version, options);
      return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    };
    module.exports = prerelease;
  },
});

// node_modules/semver/functions/compare.js
var require_compare = __commonJS({
  'node_modules/semver/functions/compare.js'(exports, module) {
    'use strict';
    var SemVer = require_semver();
    var compare2 = (a, b, loose) =>
      new SemVer(a, loose).compare(new SemVer(b, loose));
    module.exports = compare2;
  },
});

// node_modules/semver/functions/rcompare.js
var require_rcompare = __commonJS({
  'node_modules/semver/functions/rcompare.js'(exports, module) {
    'use strict';
    var compare2 = require_compare();
    var rcompare = (a, b, loose) => compare2(b, a, loose);
    module.exports = rcompare;
  },
});

// node_modules/semver/functions/compare-loose.js
var require_compare_loose = __commonJS({
  'node_modules/semver/functions/compare-loose.js'(exports, module) {
    'use strict';
    var compare2 = require_compare();
    var compareLoose = (a, b) => compare2(a, b, true);
    module.exports = compareLoose;
  },
});

// node_modules/semver/functions/compare-build.js
var require_compare_build = __commonJS({
  'node_modules/semver/functions/compare-build.js'(exports, module) {
    'use strict';
    var SemVer = require_semver();
    var compareBuild = (a, b, loose) => {
      const versionA = new SemVer(a, loose);
      const versionB = new SemVer(b, loose);
      return versionA.compare(versionB) || versionA.compareBuild(versionB);
    };
    module.exports = compareBuild;
  },
});

// node_modules/semver/functions/sort.js
var require_sort = __commonJS({
  'node_modules/semver/functions/sort.js'(exports, module) {
    'use strict';
    var compareBuild = require_compare_build();
    var sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
    module.exports = sort;
  },
});

// node_modules/semver/functions/rsort.js
var require_rsort = __commonJS({
  'node_modules/semver/functions/rsort.js'(exports, module) {
    'use strict';
    var compareBuild = require_compare_build();
    var rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose));
    module.exports = rsort;
  },
});

// node_modules/semver/functions/gt.js
var require_gt = __commonJS({
  'node_modules/semver/functions/gt.js'(exports, module) {
    'use strict';
    var compare2 = require_compare();
    var gt = (a, b, loose) => compare2(a, b, loose) > 0;
    module.exports = gt;
  },
});

// node_modules/semver/functions/lt.js
var require_lt = __commonJS({
  'node_modules/semver/functions/lt.js'(exports, module) {
    'use strict';
    var compare2 = require_compare();
    var lt = (a, b, loose) => compare2(a, b, loose) < 0;
    module.exports = lt;
  },
});

// node_modules/semver/functions/eq.js
var require_eq = __commonJS({
  'node_modules/semver/functions/eq.js'(exports, module) {
    'use strict';
    var compare2 = require_compare();
    var eq = (a, b, loose) => compare2(a, b, loose) === 0;
    module.exports = eq;
  },
});

// node_modules/semver/functions/neq.js
var require_neq = __commonJS({
  'node_modules/semver/functions/neq.js'(exports, module) {
    'use strict';
    var compare2 = require_compare();
    var neq = (a, b, loose) => compare2(a, b, loose) !== 0;
    module.exports = neq;
  },
});

// node_modules/semver/functions/gte.js
var require_gte = __commonJS({
  'node_modules/semver/functions/gte.js'(exports, module) {
    'use strict';
    var compare2 = require_compare();
    var gte = (a, b, loose) => compare2(a, b, loose) >= 0;
    module.exports = gte;
  },
});

// node_modules/semver/functions/lte.js
var require_lte = __commonJS({
  'node_modules/semver/functions/lte.js'(exports, module) {
    'use strict';
    var compare2 = require_compare();
    var lte = (a, b, loose) => compare2(a, b, loose) <= 0;
    module.exports = lte;
  },
});

// node_modules/semver/functions/cmp.js
var require_cmp = __commonJS({
  'node_modules/semver/functions/cmp.js'(exports, module) {
    'use strict';
    var eq = require_eq();
    var neq = require_neq();
    var gt = require_gt();
    var gte = require_gte();
    var lt = require_lt();
    var lte = require_lte();
    var cmp = (a, op, b, loose) => {
      switch (op) {
        case '===':
          if (typeof a === 'object') {
            a = a.version;
          }
          if (typeof b === 'object') {
            b = b.version;
          }
          return a === b;
        case '!==':
          if (typeof a === 'object') {
            a = a.version;
          }
          if (typeof b === 'object') {
            b = b.version;
          }
          return a !== b;
        case '':
        case '=':
        case '==':
          return eq(a, b, loose);
        case '!=':
          return neq(a, b, loose);
        case '>':
          return gt(a, b, loose);
        case '>=':
          return gte(a, b, loose);
        case '<':
          return lt(a, b, loose);
        case '<=':
          return lte(a, b, loose);
        default:
          throw new TypeError(`Invalid operator: ${op}`);
      }
    };
    module.exports = cmp;
  },
});

// node_modules/semver/functions/coerce.js
var require_coerce = __commonJS({
  'node_modules/semver/functions/coerce.js'(exports, module) {
    'use strict';
    var SemVer = require_semver();
    var parse2 = require_parse();
    var { safeRe: re, t } = require_re();
    var coerce = (version, options) => {
      if (version instanceof SemVer) {
        return version;
      }
      if (typeof version === 'number') {
        version = String(version);
      }
      if (typeof version !== 'string') {
        return null;
      }
      options = options || {};
      let match = null;
      if (!options.rtl) {
        match = version.match(
          options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]
        );
      } else {
        const coerceRtlRegex = options.includePrerelease
          ? re[t.COERCERTLFULL]
          : re[t.COERCERTL];
        let next;
        while (
          (next = coerceRtlRegex.exec(version)) &&
          (!match || match.index + match[0].length !== version.length)
        ) {
          if (
            !match ||
            next.index + next[0].length !== match.index + match[0].length
          ) {
            match = next;
          }
          coerceRtlRegex.lastIndex =
            next.index + next[1].length + next[2].length;
        }
        coerceRtlRegex.lastIndex = -1;
      }
      if (match === null) {
        return null;
      }
      const major = match[2];
      const minor = match[3] || '0';
      const patch = match[4] || '0';
      const prerelease =
        options.includePrerelease && match[5] ? `-${match[5]}` : '';
      const build = options.includePrerelease && match[6] ? `+${match[6]}` : '';
      return parse2(`${major}.${minor}.${patch}${prerelease}${build}`, options);
    };
    module.exports = coerce;
  },
});

// node_modules/semver/internal/lrucache.js
var require_lrucache = __commonJS({
  'node_modules/semver/internal/lrucache.js'(exports, module) {
    'use strict';
    var LRUCache = class {
      constructor() {
        this.max = 1e3;
        this.map = /* @__PURE__ */ new Map();
      }
      get(key) {
        const value = this.map.get(key);
        if (value === void 0) {
          return void 0;
        } else {
          this.map.delete(key);
          this.map.set(key, value);
          return value;
        }
      }
      delete(key) {
        return this.map.delete(key);
      }
      set(key, value) {
        const deleted = this.delete(key);
        if (!deleted && value !== void 0) {
          if (this.map.size >= this.max) {
            const firstKey = this.map.keys().next().value;
            this.delete(firstKey);
          }
          this.map.set(key, value);
        }
        return this;
      }
    };
    module.exports = LRUCache;
  },
});

// node_modules/semver/classes/range.js
var require_range = __commonJS({
  'node_modules/semver/classes/range.js'(exports, module) {
    'use strict';
    var SPACE_CHARACTERS = /\s+/g;
    var Range = class {
      constructor(range, options) {
        options = parseOptions(options);
        if (range instanceof Range) {
          if (
            range.loose === !!options.loose &&
            range.includePrerelease === !!options.includePrerelease
          ) {
            return range;
          } else {
            return new Range(range.raw, options);
          }
        }
        if (range instanceof Comparator) {
          this.raw = range.value;
          this.set = [[range]];
          this.formatted = void 0;
          return this;
        }
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        this.raw = range.trim().replace(SPACE_CHARACTERS, ' ');
        this.set = this.raw
          .split('||')
          .map((r) => this.parseRange(r.trim()))
          .filter((c) => c.length);
        if (!this.set.length) {
          throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
        }
        if (this.set.length > 1) {
          const first = this.set[0];
          this.set = this.set.filter((c) => !isNullSet(c[0]));
          if (this.set.length === 0) {
            this.set = [first];
          } else if (this.set.length > 1) {
            for (const c of this.set) {
              if (c.length === 1 && isAny(c[0])) {
                this.set = [c];
                break;
              }
            }
          }
        }
        this.formatted = void 0;
      }
      get range() {
        if (this.formatted === void 0) {
          this.formatted = '';
          for (let i = 0; i < this.set.length; i++) {
            if (i > 0) {
              this.formatted += '||';
            }
            const comps = this.set[i];
            for (let k = 0; k < comps.length; k++) {
              if (k > 0) {
                this.formatted += ' ';
              }
              this.formatted += comps[k].toString().trim();
            }
          }
        }
        return this.formatted;
      }
      format() {
        return this.range;
      }
      toString() {
        return this.range;
      }
      parseRange(range) {
        const memoOpts =
          (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) |
          (this.options.loose && FLAG_LOOSE);
        const memoKey = memoOpts + ':' + range;
        const cached = cache.get(memoKey);
        if (cached) {
          return cached;
        }
        const loose = this.options.loose;
        const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
        range = range.replace(
          hr,
          hyphenReplace(this.options.includePrerelease)
        );
        debug('hyphen replace', range);
        range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
        debug('comparator trim', range);
        range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
        debug('tilde trim', range);
        range = range.replace(re[t.CARETTRIM], caretTrimReplace);
        debug('caret trim', range);
        let rangeList = range
          .split(' ')
          .map((comp) => parseComparator(comp, this.options))
          .join(' ')
          .split(/\s+/)
          .map((comp) => replaceGTE0(comp, this.options));
        if (loose) {
          rangeList = rangeList.filter((comp) => {
            debug('loose invalid filter', comp, this.options);
            return !!comp.match(re[t.COMPARATORLOOSE]);
          });
        }
        debug('range list', rangeList);
        const rangeMap = /* @__PURE__ */ new Map();
        const comparators = rangeList.map(
          (comp) => new Comparator(comp, this.options)
        );
        for (const comp of comparators) {
          if (isNullSet(comp)) {
            return [comp];
          }
          rangeMap.set(comp.value, comp);
        }
        if (rangeMap.size > 1 && rangeMap.has('')) {
          rangeMap.delete('');
        }
        const result = [...rangeMap.values()];
        cache.set(memoKey, result);
        return result;
      }
      intersects(range, options) {
        if (!(range instanceof Range)) {
          throw new TypeError('a Range is required');
        }
        return this.set.some((thisComparators) => {
          return (
            isSatisfiable(thisComparators, options) &&
            range.set.some((rangeComparators) => {
              return (
                isSatisfiable(rangeComparators, options) &&
                thisComparators.every((thisComparator) => {
                  return rangeComparators.every((rangeComparator) => {
                    return thisComparator.intersects(rangeComparator, options);
                  });
                })
              );
            })
          );
        });
      }
      // if ANY of the sets match ALL of its comparators, then pass
      test(version) {
        if (!version) {
          return false;
        }
        if (typeof version === 'string') {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        for (let i = 0; i < this.set.length; i++) {
          if (testSet(this.set[i], version, this.options)) {
            return true;
          }
        }
        return false;
      }
    };
    module.exports = Range;
    var LRU = require_lrucache();
    var cache = new LRU();
    var parseOptions = require_parse_options();
    var Comparator = require_comparator();
    var debug = require_debug();
    var SemVer = require_semver();
    var {
      safeRe: re,
      t,
      comparatorTrimReplace,
      tildeTrimReplace,
      caretTrimReplace,
    } = require_re();
    var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
    var isNullSet = (c) => c.value === '<0.0.0-0';
    var isAny = (c) => c.value === '';
    var isSatisfiable = (comparators, options) => {
      let result = true;
      const remainingComparators = comparators.slice();
      let testComparator = remainingComparators.pop();
      while (result && remainingComparators.length) {
        result = remainingComparators.every((otherComparator) => {
          return testComparator.intersects(otherComparator, options);
        });
        testComparator = remainingComparators.pop();
      }
      return result;
    };
    var parseComparator = (comp, options) => {
      comp = comp.replace(re[t.BUILD], '');
      debug('comp', comp, options);
      comp = replaceCarets(comp, options);
      debug('caret', comp);
      comp = replaceTildes(comp, options);
      debug('tildes', comp);
      comp = replaceXRanges(comp, options);
      debug('xrange', comp);
      comp = replaceStars(comp, options);
      debug('stars', comp);
      return comp;
    };
    var isX = (id) => !id || id.toLowerCase() === 'x' || id === '*';
    var replaceTildes = (comp, options) => {
      return comp
        .trim()
        .split(/\s+/)
        .map((c) => replaceTilde(c, options))
        .join(' ');
    };
    var replaceTilde = (comp, options) => {
      const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
      return comp.replace(r, (_, M, m, p, pr) => {
        debug('tilde', comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = '';
        } else if (isX(m)) {
          ret = `>=${M}.0.0 <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0-0`;
        } else if (pr) {
          debug('replaceTilde pr', pr);
          ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
        }
        debug('tilde return', ret);
        return ret;
      });
    };
    var replaceCarets = (comp, options) => {
      return comp
        .trim()
        .split(/\s+/)
        .map((c) => replaceCaret(c, options))
        .join(' ');
    };
    var replaceCaret = (comp, options) => {
      debug('caret', comp, options);
      const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
      const z = options.includePrerelease ? '-0' : '';
      return comp.replace(r, (_, M, m, p, pr) => {
        debug('caret', comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = '';
        } else if (isX(m)) {
          ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          if (M === '0') {
            ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
          } else {
            ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
          }
        } else if (pr) {
          debug('replaceCaret pr', pr);
          if (M === '0') {
            if (m === '0') {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
          }
        } else {
          debug('no pr');
          if (M === '0') {
            if (m === '0') {
              ret = `>=${M}.${m}.${p}${z} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}${z} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
          }
        }
        debug('caret return', ret);
        return ret;
      });
    };
    var replaceXRanges = (comp, options) => {
      debug('replaceXRanges', comp, options);
      return comp
        .split(/\s+/)
        .map((c) => replaceXRange(c, options))
        .join(' ');
    };
    var replaceXRange = (comp, options) => {
      comp = comp.trim();
      const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
      return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
        debug('xRange', comp, ret, gtlt, M, m, p, pr);
        const xM = isX(M);
        const xm = xM || isX(m);
        const xp = xm || isX(p);
        const anyX = xp;
        if (gtlt === '=' && anyX) {
          gtlt = '';
        }
        pr = options.includePrerelease ? '-0' : '';
        if (xM) {
          if (gtlt === '>' || gtlt === '<') {
            ret = '<0.0.0-0';
          } else {
            ret = '*';
          }
        } else if (gtlt && anyX) {
          if (xm) {
            m = 0;
          }
          p = 0;
          if (gtlt === '>') {
            gtlt = '>=';
            if (xm) {
              M = +M + 1;
              m = 0;
              p = 0;
            } else {
              m = +m + 1;
              p = 0;
            }
          } else if (gtlt === '<=') {
            gtlt = '<';
            if (xm) {
              M = +M + 1;
            } else {
              m = +m + 1;
            }
          }
          if (gtlt === '<') {
            pr = '-0';
          }
          ret = `${gtlt + M}.${m}.${p}${pr}`;
        } else if (xm) {
          ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
        } else if (xp) {
          ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
        }
        debug('xRange return', ret);
        return ret;
      });
    };
    var replaceStars = (comp, options) => {
      debug('replaceStars', comp, options);
      return comp.trim().replace(re[t.STAR], '');
    };
    var replaceGTE0 = (comp, options) => {
      debug('replaceGTE0', comp, options);
      return comp
        .trim()
        .replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], '');
    };
    var hyphenReplace =
      (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
        if (isX(fM)) {
          from = '';
        } else if (isX(fm)) {
          from = `>=${fM}.0.0${incPr ? '-0' : ''}`;
        } else if (isX(fp)) {
          from = `>=${fM}.${fm}.0${incPr ? '-0' : ''}`;
        } else if (fpr) {
          from = `>=${from}`;
        } else {
          from = `>=${from}${incPr ? '-0' : ''}`;
        }
        if (isX(tM)) {
          to = '';
        } else if (isX(tm)) {
          to = `<${+tM + 1}.0.0-0`;
        } else if (isX(tp)) {
          to = `<${tM}.${+tm + 1}.0-0`;
        } else if (tpr) {
          to = `<=${tM}.${tm}.${tp}-${tpr}`;
        } else if (incPr) {
          to = `<${tM}.${tm}.${+tp + 1}-0`;
        } else {
          to = `<=${to}`;
        }
        return `${from} ${to}`.trim();
      };
    var testSet = (set, version, options) => {
      for (let i = 0; i < set.length; i++) {
        if (!set[i].test(version)) {
          return false;
        }
      }
      if (version.prerelease.length && !options.includePrerelease) {
        for (let i = 0; i < set.length; i++) {
          debug(set[i].semver);
          if (set[i].semver === Comparator.ANY) {
            continue;
          }
          if (set[i].semver.prerelease.length > 0) {
            const allowed = set[i].semver;
            if (
              allowed.major === version.major &&
              allowed.minor === version.minor &&
              allowed.patch === version.patch
            ) {
              return true;
            }
          }
        }
        return false;
      }
      return true;
    };
  },
});

// node_modules/semver/classes/comparator.js
var require_comparator = __commonJS({
  'node_modules/semver/classes/comparator.js'(exports, module) {
    'use strict';
    var ANY = Symbol('SemVer ANY');
    var Comparator = class {
      static get ANY() {
        return ANY;
      }
      constructor(comp, options) {
        options = parseOptions(options);
        if (comp instanceof Comparator) {
          if (comp.loose === !!options.loose) {
            return comp;
          } else {
            comp = comp.value;
          }
        }
        comp = comp.trim().split(/\s+/).join(' ');
        debug('comparator', comp, options);
        this.options = options;
        this.loose = !!options.loose;
        this.parse(comp);
        if (this.semver === ANY) {
          this.value = '';
        } else {
          this.value = this.operator + this.semver.version;
        }
        debug('comp', this);
      }
      parse(comp) {
        const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
        const m = comp.match(r);
        if (!m) {
          throw new TypeError(`Invalid comparator: ${comp}`);
        }
        this.operator = m[1] !== void 0 ? m[1] : '';
        if (this.operator === '=') {
          this.operator = '';
        }
        if (!m[2]) {
          this.semver = ANY;
        } else {
          this.semver = new SemVer(m[2], this.options.loose);
        }
      }
      toString() {
        return this.value;
      }
      test(version) {
        debug('Comparator.test', version, this.options.loose);
        if (this.semver === ANY || version === ANY) {
          return true;
        }
        if (typeof version === 'string') {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        return cmp(version, this.operator, this.semver, this.options);
      }
      intersects(comp, options) {
        if (!(comp instanceof Comparator)) {
          throw new TypeError('a Comparator is required');
        }
        if (this.operator === '') {
          if (this.value === '') {
            return true;
          }
          return new Range(comp.value, options).test(this.value);
        } else if (comp.operator === '') {
          if (comp.value === '') {
            return true;
          }
          return new Range(this.value, options).test(comp.semver);
        }
        options = parseOptions(options);
        if (
          options.includePrerelease &&
          (this.value === '<0.0.0-0' || comp.value === '<0.0.0-0')
        ) {
          return false;
        }
        if (
          !options.includePrerelease &&
          (this.value.startsWith('<0.0.0') || comp.value.startsWith('<0.0.0'))
        ) {
          return false;
        }
        if (this.operator.startsWith('>') && comp.operator.startsWith('>')) {
          return true;
        }
        if (this.operator.startsWith('<') && comp.operator.startsWith('<')) {
          return true;
        }
        if (
          this.semver.version === comp.semver.version &&
          this.operator.includes('=') &&
          comp.operator.includes('=')
        ) {
          return true;
        }
        if (
          cmp(this.semver, '<', comp.semver, options) &&
          this.operator.startsWith('>') &&
          comp.operator.startsWith('<')
        ) {
          return true;
        }
        if (
          cmp(this.semver, '>', comp.semver, options) &&
          this.operator.startsWith('<') &&
          comp.operator.startsWith('>')
        ) {
          return true;
        }
        return false;
      }
    };
    module.exports = Comparator;
    var parseOptions = require_parse_options();
    var { safeRe: re, t } = require_re();
    var cmp = require_cmp();
    var debug = require_debug();
    var SemVer = require_semver();
    var Range = require_range();
  },
});

// node_modules/semver/functions/satisfies.js
var require_satisfies = __commonJS({
  'node_modules/semver/functions/satisfies.js'(exports, module) {
    'use strict';
    var Range = require_range();
    var satisfies = (version, range, options) => {
      try {
        range = new Range(range, options);
      } catch (er) {
        return false;
      }
      return range.test(version);
    };
    module.exports = satisfies;
  },
});

// node_modules/semver/ranges/to-comparators.js
var require_to_comparators = __commonJS({
  'node_modules/semver/ranges/to-comparators.js'(exports, module) {
    'use strict';
    var Range = require_range();
    var toComparators = (range, options) =>
      new Range(range, options).set.map((comp) =>
        comp
          .map((c) => c.value)
          .join(' ')
          .trim()
          .split(' ')
      );
    module.exports = toComparators;
  },
});

// node_modules/semver/ranges/max-satisfying.js
var require_max_satisfying = __commonJS({
  'node_modules/semver/ranges/max-satisfying.js'(exports, module) {
    'use strict';
    var SemVer = require_semver();
    var Range = require_range();
    var maxSatisfying = (versions, range, options) => {
      let max = null;
      let maxSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!max || maxSV.compare(v) === -1) {
            max = v;
            maxSV = new SemVer(max, options);
          }
        }
      });
      return max;
    };
    module.exports = maxSatisfying;
  },
});

// node_modules/semver/ranges/min-satisfying.js
var require_min_satisfying = __commonJS({
  'node_modules/semver/ranges/min-satisfying.js'(exports, module) {
    'use strict';
    var SemVer = require_semver();
    var Range = require_range();
    var minSatisfying = (versions, range, options) => {
      let min = null;
      let minSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!min || minSV.compare(v) === 1) {
            min = v;
            minSV = new SemVer(min, options);
          }
        }
      });
      return min;
    };
    module.exports = minSatisfying;
  },
});

// node_modules/semver/ranges/min-version.js
var require_min_version = __commonJS({
  'node_modules/semver/ranges/min-version.js'(exports, module) {
    'use strict';
    var SemVer = require_semver();
    var Range = require_range();
    var gt = require_gt();
    var minVersion = (range, loose) => {
      range = new Range(range, loose);
      let minver = new SemVer('0.0.0');
      if (range.test(minver)) {
        return minver;
      }
      minver = new SemVer('0.0.0-0');
      if (range.test(minver)) {
        return minver;
      }
      minver = null;
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let setMin = null;
        comparators.forEach((comparator) => {
          const compver = new SemVer(comparator.semver.version);
          switch (comparator.operator) {
            case '>':
              if (compver.prerelease.length === 0) {
                compver.patch++;
              } else {
                compver.prerelease.push(0);
              }
              compver.raw = compver.format();
            case '':
            case '>=':
              if (!setMin || gt(compver, setMin)) {
                setMin = compver;
              }
              break;
            case '<':
            case '<=':
              break;
            default:
              throw new Error(`Unexpected operation: ${comparator.operator}`);
          }
        });
        if (setMin && (!minver || gt(minver, setMin))) {
          minver = setMin;
        }
      }
      if (minver && range.test(minver)) {
        return minver;
      }
      return null;
    };
    module.exports = minVersion;
  },
});

// node_modules/semver/ranges/valid.js
var require_valid2 = __commonJS({
  'node_modules/semver/ranges/valid.js'(exports, module) {
    'use strict';
    var Range = require_range();
    var validRange = (range, options) => {
      try {
        return new Range(range, options).range || '*';
      } catch (er) {
        return null;
      }
    };
    module.exports = validRange;
  },
});

// node_modules/semver/ranges/outside.js
var require_outside = __commonJS({
  'node_modules/semver/ranges/outside.js'(exports, module) {
    'use strict';
    var SemVer = require_semver();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var Range = require_range();
    var satisfies = require_satisfies();
    var gt = require_gt();
    var lt = require_lt();
    var lte = require_lte();
    var gte = require_gte();
    var outside = (version, range, hilo, options) => {
      version = new SemVer(version, options);
      range = new Range(range, options);
      let gtfn, ltefn, ltfn, comp, ecomp;
      switch (hilo) {
        case '>':
          gtfn = gt;
          ltefn = lte;
          ltfn = lt;
          comp = '>';
          ecomp = '>=';
          break;
        case '<':
          gtfn = lt;
          ltefn = gte;
          ltfn = gt;
          comp = '<';
          ecomp = '<=';
          break;
        default:
          throw new TypeError('Must provide a hilo val of "<" or ">"');
      }
      if (satisfies(version, range, options)) {
        return false;
      }
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let high = null;
        let low = null;
        comparators.forEach((comparator) => {
          if (comparator.semver === ANY) {
            comparator = new Comparator('>=0.0.0');
          }
          high = high || comparator;
          low = low || comparator;
          if (gtfn(comparator.semver, high.semver, options)) {
            high = comparator;
          } else if (ltfn(comparator.semver, low.semver, options)) {
            low = comparator;
          }
        });
        if (high.operator === comp || high.operator === ecomp) {
          return false;
        }
        if (
          (!low.operator || low.operator === comp) &&
          ltefn(version, low.semver)
        ) {
          return false;
        } else if (low.operator === ecomp && ltfn(version, low.semver)) {
          return false;
        }
      }
      return true;
    };
    module.exports = outside;
  },
});

// node_modules/semver/ranges/gtr.js
var require_gtr = __commonJS({
  'node_modules/semver/ranges/gtr.js'(exports, module) {
    'use strict';
    var outside = require_outside();
    var gtr = (version, range, options) =>
      outside(version, range, '>', options);
    module.exports = gtr;
  },
});

// node_modules/semver/ranges/ltr.js
var require_ltr = __commonJS({
  'node_modules/semver/ranges/ltr.js'(exports, module) {
    'use strict';
    var outside = require_outside();
    var ltr = (version, range, options) =>
      outside(version, range, '<', options);
    module.exports = ltr;
  },
});

// node_modules/semver/ranges/intersects.js
var require_intersects = __commonJS({
  'node_modules/semver/ranges/intersects.js'(exports, module) {
    'use strict';
    var Range = require_range();
    var intersects = (r1, r2, options) => {
      r1 = new Range(r1, options);
      r2 = new Range(r2, options);
      return r1.intersects(r2, options);
    };
    module.exports = intersects;
  },
});

// node_modules/semver/ranges/simplify.js
var require_simplify = __commonJS({
  'node_modules/semver/ranges/simplify.js'(exports, module) {
    'use strict';
    var satisfies = require_satisfies();
    var compare2 = require_compare();
    module.exports = (versions, range, options) => {
      const set = [];
      let first = null;
      let prev = null;
      const v = versions.sort((a, b) => compare2(a, b, options));
      for (const version of v) {
        const included = satisfies(version, range, options);
        if (included) {
          prev = version;
          if (!first) {
            first = version;
          }
        } else {
          if (prev) {
            set.push([first, prev]);
          }
          prev = null;
          first = null;
        }
      }
      if (first) {
        set.push([first, null]);
      }
      const ranges = [];
      for (const [min, max] of set) {
        if (min === max) {
          ranges.push(min);
        } else if (!max && min === v[0]) {
          ranges.push('*');
        } else if (!max) {
          ranges.push(`>=${min}`);
        } else if (min === v[0]) {
          ranges.push(`<=${max}`);
        } else {
          ranges.push(`${min} - ${max}`);
        }
      }
      const simplified = ranges.join(' || ');
      const original =
        typeof range.raw === 'string' ? range.raw : String(range);
      return simplified.length < original.length ? simplified : range;
    };
  },
});

// node_modules/semver/ranges/subset.js
var require_subset = __commonJS({
  'node_modules/semver/ranges/subset.js'(exports, module) {
    'use strict';
    var Range = require_range();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var satisfies = require_satisfies();
    var compare2 = require_compare();
    var subset = (sub, dom, options = {}) => {
      if (sub === dom) {
        return true;
      }
      sub = new Range(sub, options);
      dom = new Range(dom, options);
      let sawNonNull = false;
      OUTER: for (const simpleSub of sub.set) {
        for (const simpleDom of dom.set) {
          const isSub = simpleSubset(simpleSub, simpleDom, options);
          sawNonNull = sawNonNull || isSub !== null;
          if (isSub) {
            continue OUTER;
          }
        }
        if (sawNonNull) {
          return false;
        }
      }
      return true;
    };
    var minimumVersionWithPreRelease = [new Comparator('>=0.0.0-0')];
    var minimumVersion = [new Comparator('>=0.0.0')];
    var simpleSubset = (sub, dom, options) => {
      if (sub === dom) {
        return true;
      }
      if (sub.length === 1 && sub[0].semver === ANY) {
        if (dom.length === 1 && dom[0].semver === ANY) {
          return true;
        } else if (options.includePrerelease) {
          sub = minimumVersionWithPreRelease;
        } else {
          sub = minimumVersion;
        }
      }
      if (dom.length === 1 && dom[0].semver === ANY) {
        if (options.includePrerelease) {
          return true;
        } else {
          dom = minimumVersion;
        }
      }
      const eqSet = /* @__PURE__ */ new Set();
      let gt, lt;
      for (const c of sub) {
        if (c.operator === '>' || c.operator === '>=') {
          gt = higherGT(gt, c, options);
        } else if (c.operator === '<' || c.operator === '<=') {
          lt = lowerLT(lt, c, options);
        } else {
          eqSet.add(c.semver);
        }
      }
      if (eqSet.size > 1) {
        return null;
      }
      let gtltComp;
      if (gt && lt) {
        gtltComp = compare2(gt.semver, lt.semver, options);
        if (gtltComp > 0) {
          return null;
        } else if (
          gtltComp === 0 &&
          (gt.operator !== '>=' || lt.operator !== '<=')
        ) {
          return null;
        }
      }
      for (const eq of eqSet) {
        if (gt && !satisfies(eq, String(gt), options)) {
          return null;
        }
        if (lt && !satisfies(eq, String(lt), options)) {
          return null;
        }
        for (const c of dom) {
          if (!satisfies(eq, String(c), options)) {
            return false;
          }
        }
        return true;
      }
      let higher, lower;
      let hasDomLT, hasDomGT;
      let needDomLTPre =
        lt && !options.includePrerelease && lt.semver.prerelease.length
          ? lt.semver
          : false;
      let needDomGTPre =
        gt && !options.includePrerelease && gt.semver.prerelease.length
          ? gt.semver
          : false;
      if (
        needDomLTPre &&
        needDomLTPre.prerelease.length === 1 &&
        lt.operator === '<' &&
        needDomLTPre.prerelease[0] === 0
      ) {
        needDomLTPre = false;
      }
      for (const c of dom) {
        hasDomGT = hasDomGT || c.operator === '>' || c.operator === '>=';
        hasDomLT = hasDomLT || c.operator === '<' || c.operator === '<=';
        if (gt) {
          if (needDomGTPre) {
            if (
              c.semver.prerelease &&
              c.semver.prerelease.length &&
              c.semver.major === needDomGTPre.major &&
              c.semver.minor === needDomGTPre.minor &&
              c.semver.patch === needDomGTPre.patch
            ) {
              needDomGTPre = false;
            }
          }
          if (c.operator === '>' || c.operator === '>=') {
            higher = higherGT(gt, c, options);
            if (higher === c && higher !== gt) {
              return false;
            }
          } else if (
            gt.operator === '>=' &&
            !satisfies(gt.semver, String(c), options)
          ) {
            return false;
          }
        }
        if (lt) {
          if (needDomLTPre) {
            if (
              c.semver.prerelease &&
              c.semver.prerelease.length &&
              c.semver.major === needDomLTPre.major &&
              c.semver.minor === needDomLTPre.minor &&
              c.semver.patch === needDomLTPre.patch
            ) {
              needDomLTPre = false;
            }
          }
          if (c.operator === '<' || c.operator === '<=') {
            lower = lowerLT(lt, c, options);
            if (lower === c && lower !== lt) {
              return false;
            }
          } else if (
            lt.operator === '<=' &&
            !satisfies(lt.semver, String(c), options)
          ) {
            return false;
          }
        }
        if (!c.operator && (lt || gt) && gtltComp !== 0) {
          return false;
        }
      }
      if (gt && hasDomLT && !lt && gtltComp !== 0) {
        return false;
      }
      if (lt && hasDomGT && !gt && gtltComp !== 0) {
        return false;
      }
      if (needDomGTPre || needDomLTPre) {
        return false;
      }
      return true;
    };
    var higherGT = (a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare2(a.semver, b.semver, options);
      return comp > 0
        ? a
        : comp < 0
          ? b
          : b.operator === '>' && a.operator === '>='
            ? b
            : a;
    };
    var lowerLT = (a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare2(a.semver, b.semver, options);
      return comp < 0
        ? a
        : comp > 0
          ? b
          : b.operator === '<' && a.operator === '<='
            ? b
            : a;
    };
    module.exports = subset;
  },
});

// node_modules/semver/index.js
var require_semver2 = __commonJS({
  'node_modules/semver/index.js'(exports, module) {
    'use strict';
    var internalRe = require_re();
    var constants2 = require_constants();
    var SemVer = require_semver();
    var identifiers = require_identifiers();
    var parse2 = require_parse();
    var valid = require_valid();
    var clean = require_clean();
    var inc = require_inc();
    var diff = require_diff();
    var major = require_major();
    var minor = require_minor();
    var patch = require_patch();
    var prerelease = require_prerelease();
    var compare2 = require_compare();
    var rcompare = require_rcompare();
    var compareLoose = require_compare_loose();
    var compareBuild = require_compare_build();
    var sort = require_sort();
    var rsort = require_rsort();
    var gt = require_gt();
    var lt = require_lt();
    var eq = require_eq();
    var neq = require_neq();
    var gte = require_gte();
    var lte = require_lte();
    var cmp = require_cmp();
    var coerce = require_coerce();
    var Comparator = require_comparator();
    var Range = require_range();
    var satisfies = require_satisfies();
    var toComparators = require_to_comparators();
    var maxSatisfying = require_max_satisfying();
    var minSatisfying = require_min_satisfying();
    var minVersion = require_min_version();
    var validRange = require_valid2();
    var outside = require_outside();
    var gtr = require_gtr();
    var ltr = require_ltr();
    var intersects = require_intersects();
    var simplifyRange = require_simplify();
    var subset = require_subset();
    module.exports = {
      parse: parse2,
      valid,
      clean,
      inc,
      diff,
      major,
      minor,
      patch,
      prerelease,
      compare: compare2,
      rcompare,
      compareLoose,
      compareBuild,
      sort,
      rsort,
      gt,
      lt,
      eq,
      neq,
      gte,
      lte,
      cmp,
      coerce,
      Comparator,
      Range,
      satisfies,
      toComparators,
      maxSatisfying,
      minSatisfying,
      minVersion,
      validRange,
      outside,
      gtr,
      ltr,
      intersects,
      simplifyRange,
      subset,
      SemVer,
      re: internalRe.re,
      src: internalRe.src,
      tokens: internalRe.t,
      SEMVER_SPEC_VERSION: constants2.SEMVER_SPEC_VERSION,
      RELEASE_TYPES: constants2.RELEASE_TYPES,
      compareIdentifiers: identifiers.compareIdentifiers,
      rcompareIdentifiers: identifiers.rcompareIdentifiers,
    };
  },
});

// node_modules/@shopify/shopify-app-session-storage-memory/dist/cjs/memory.js
var require_memory = __commonJS({
  'node_modules/@shopify/shopify-app-session-storage-memory/dist/cjs/memory.js'(
    exports
  ) {
    'use strict';
    var MemorySessionStorage2 = class {
      sessions = {};
      async storeSession(session) {
        this.sessions[session.id] = session;
        return true;
      }
      async loadSession(id) {
        return this.sessions[id] || void 0;
      }
      async deleteSession(id) {
        if (this.sessions[id]) {
          delete this.sessions[id];
        }
        return true;
      }
      async deleteSessions(ids) {
        ids.forEach((id) => delete this.sessions[id]);
        return true;
      }
      async findSessionsByShop(shop) {
        const results = Object.values(this.sessions).filter(
          (session) => session.shop === shop
        );
        return results;
      }
    };
    exports.MemorySessionStorage = MemorySessionStorage2;
  },
});

// app/routes/app.customize.jsx
import { useEffect, useState, useRef, memo, useCallback, useMemo } from 'react';
import { json } from '@remix-run/node';
import fs from 'fs';
import path from 'path';
import {
  useLoaderData,
  useFetcher,
  useSearchParams,
  useNavigate,
} from '@remix-run/react';
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  RangeSlider,
  Checkbox,
  Button,
  ButtonGroup,
  Modal,
  ColorPicker,
  Popover,
  hexToRgb,
  Icon,
  Text,
  Tabs,
  BlockStack,
  Box,
} from '@shopify/polaris';
import {
  EditIcon,
  DesktopIcon,
  MobileIcon,
  LayoutColumns3Icon,
  PaintBrushFlatIcon,
  SettingsIcon,
} from '@shopify/polaris-icons';
import { TitleBar, useAppBridge } from '@shopify/app-bridge-react';

// node_modules/@shopify/shopify-app-remix/dist/esm/server/adapters/node/index.mjs
import crypto2 from 'crypto';

// node_modules/@shopify/shopify-api/dist/esm/runtime/crypto/crypto.mjs
var cryptoVar;
try {
  cryptoVar = crypto;
} catch (_e) {}
function setCrypto(crypto6) {
  cryptoVar = crypto6;
}

// node_modules/@shopify/shopify-api/dist/esm/runtime/crypto/types.mjs
var HashFormat;
(function (HashFormat2) {
  HashFormat2['Base64'] = 'base64';
  HashFormat2['Hex'] = 'hex';
})(HashFormat || (HashFormat = {}));

// node_modules/@shopify/shopify-api/dist/esm/runtime/http/index.mjs
function isOK(resp) {
  return resp.statusCode >= 200 && resp.statusCode <= 299;
}
var abstractFetch = () => {
  throw new Error(
    "Missing adapter implementation for 'abstractFetch' - make sure to import the appropriate adapter for your platform"
  );
};
function setAbstractFetchFunc(func) {
  abstractFetch = func;
}
var abstractConvertRequest = () => {
  throw new Error(
    "Missing adapter implementation for 'abstractConvertRequest' - make sure to import the appropriate adapter for your platform"
  );
};
function setAbstractConvertRequestFunc(func) {
  abstractConvertRequest = func;
}
var abstractConvertIncomingResponse = () => Promise.resolve({});
var abstractConvertResponse = () => {
  throw new Error(
    "Missing adapter implementation for 'abstractConvertResponse' - make sure to import the appropriate adapter for your platform"
  );
};
function setAbstractConvertResponseFunc(func) {
  abstractConvertResponse = func;
}
var abstractConvertHeaders = () => {
  throw new Error(
    "Missing adapter implementation for 'abstractConvertHeaders' - make sure to import the appropriate adapter for your platform"
  );
};
function setAbstractConvertHeadersFunc(func) {
  abstractConvertHeaders = func;
}

// node_modules/@shopify/shopify-api/dist/esm/lib/error.mjs
var ShopifyError = class extends Error {
  constructor(message2) {
    super(message2);
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
var InvalidHmacError = class extends ShopifyError {};
var InvalidShopError = class extends ShopifyError {};
var InvalidHostError = class extends ShopifyError {};
var InvalidJwtError = class extends ShopifyError {};
var MissingJwtTokenError = class extends ShopifyError {};
var InvalidDeliveryMethodError = class extends ShopifyError {};
var SafeCompareError = class extends ShopifyError {};
var PrivateAppError = class extends ShopifyError {};
var HttpRequestError = class extends ShopifyError {};
var HttpMaxRetriesError = class extends ShopifyError {};
var HttpResponseError = class extends ShopifyError {
  response;
  constructor({ message: message2, code, statusText, body, headers }) {
    super(message2);
    this.response = {
      code,
      statusText,
      body,
      headers,
    };
  }
};
var HttpRetriableError = class extends HttpResponseError {};
var HttpInternalError = class extends HttpRetriableError {};
var HttpThrottlingError = class extends HttpRetriableError {
  constructor({ retryAfter, ...params }) {
    super(params);
    this.response.retryAfter = retryAfter;
  }
};
var GraphqlQueryError = class extends ShopifyError {
  response;
  headers;
  body;
  constructor({ message: message2, response, headers, body }) {
    super(message2);
    this.response = response;
    this.headers = headers;
    this.body = body;
  }
};
var InvalidOAuthError = class extends ShopifyError {};
var BotActivityDetected = class extends ShopifyError {};
var CookieNotFound = class extends ShopifyError {};
var InvalidSession = class extends ShopifyError {};
var InvalidWebhookError = class extends ShopifyError {
  response;
  constructor({ message: message2, response }) {
    super(message2);
    this.response = response;
  }
};
var MissingWebhookCallbackError = class extends InvalidWebhookError {};
var MissingRequiredArgument = class extends ShopifyError {};
var InvalidRequestError = class extends ShopifyError {};
var BillingError = class extends ShopifyError {
  errorData;
  constructor({ message: message2, errorData }) {
    super(message2);
    this.errorData = errorData;
  }
};
var FeatureDeprecatedError = class extends ShopifyError {};

// node_modules/@shopify/shopify-api/dist/esm/runtime/crypto/utils.mjs
async function createSHA256HMAC(
  secret,
  payload,
  returnFormat = HashFormat.Base64
) {
  const cryptoLib =
    typeof cryptoVar?.webcrypto === 'undefined'
      ? cryptoVar
      : cryptoVar.webcrypto;
  const enc = new TextEncoder();
  const key = await cryptoLib.subtle.importKey(
    'raw',
    enc.encode(secret),
    {
      name: 'HMAC',
      hash: { name: 'SHA-256' },
    },
    false,
    ['sign']
  );
  const signature = await cryptoLib.subtle.sign(
    'HMAC',
    key,
    enc.encode(payload)
  );
  return returnFormat === HashFormat.Base64
    ? asBase64(signature)
    : asHex(signature);
}
function asHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
var LookupTable =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
function asBase64(buffer) {
  let output = '';
  const input = new Uint8Array(buffer);
  for (let i = 0; i < input.length; ) {
    const byte1 = input[i++];
    const byte2 = input[i++];
    const byte3 = input[i++];
    const enc1 = byte1 >> 2;
    const enc2 = ((byte1 & 3) << 4) | (byte2 >> 4);
    let enc3 = ((byte2 & 15) << 2) | (byte3 >> 6);
    let enc4 = byte3 & 63;
    if (isNaN(byte2)) {
      enc3 = 64;
    }
    if (isNaN(byte3)) {
      enc4 = 64;
    }
    output +=
      LookupTable[enc1] +
      LookupTable[enc2] +
      LookupTable[enc3] +
      LookupTable[enc4];
  }
  return output;
}
function hashString(str, returnFormat) {
  const buffer = new TextEncoder().encode(str);
  switch (returnFormat) {
    case HashFormat.Base64:
      return asBase64(buffer);
    case HashFormat.Hex:
      return asHex(buffer);
    default:
      throw new ShopifyError(`Unrecognized hash format '${returnFormat}'`);
  }
}

// node_modules/@shopify/shopify-api/dist/esm/runtime/platform/runtime-string.mjs
var abstractRuntimeString = () => {
  throw new Error(
    "Missing adapter implementation for 'abstractRuntimeString' - make sure to import the appropriate adapter for your platform"
  );
};
function setAbstractRuntimeString(func) {
  abstractRuntimeString = func;
}

// node_modules/@shopify/shopify-api/dist/esm/runtime/http/utils.mjs
function splitN(str, sep, maxNumParts) {
  const parts = str.split(sep);
  const maxParts = Math.min(Math.abs(maxNumParts), parts.length);
  return [...parts.slice(0, maxParts - 1), parts.slice(maxParts - 1).join(sep)];
}

// node_modules/@shopify/shopify-api/dist/esm/runtime/http/headers.mjs
function canonicalizeHeaderName(hdr) {
  return hdr.replace(
    /(^|-)(\w+)/g,
    (_fullMatch, start, letters) =>
      start + letters.slice(0, 1).toUpperCase() + letters.slice(1).toLowerCase()
  );
}
function getHeaders(headers, needle_) {
  const result = [];
  if (!headers) return result;
  const needle = canonicalizeHeaderName(needle_);
  for (const [key, values] of Object.entries(headers)) {
    if (canonicalizeHeaderName(key) !== needle) continue;
    if (Array.isArray(values)) {
      result.push(...values);
    } else {
      result.push(values);
    }
  }
  return result;
}
function getHeader(headers, needle) {
  if (!headers) return void 0;
  return getHeaders(headers, needle)?.[0];
}
function addHeader(headers, key, value) {
  canonicalizeHeaders(headers);
  const canonKey = canonicalizeHeaderName(key);
  let list = headers[canonKey];
  if (!list) {
    list = [];
  } else if (!Array.isArray(list)) {
    list = [list];
  }
  headers[canonKey] = list;
  list.push(value);
}
function canonicalizeValue(value) {
  if (typeof value === 'number') return value.toString();
  return value;
}
function canonicalizeHeaders(hdr) {
  for (const [key, values] of Object.entries(hdr)) {
    const canonKey = canonicalizeHeaderName(key);
    if (!hdr[canonKey]) hdr[canonKey] = [];
    if (!Array.isArray(hdr[canonKey]))
      hdr[canonKey] = [canonicalizeValue(hdr[canonKey])];
    if (key === canonKey) continue;
    delete hdr[key];
    hdr[canonKey].push(
      ...[values].flat().map((value) => canonicalizeValue(value))
    );
  }
  return hdr;
}
function removeHeader(headers, needle) {
  canonicalizeHeaders(headers);
  const canonKey = canonicalizeHeaderName(needle);
  delete headers[canonKey];
}
function flatHeaders(headers) {
  if (!headers) return [];
  return Object.entries(headers).flatMap(([header, values]) =>
    Array.isArray(values)
      ? values.map((value) => [header, value])
      : [[header, values]]
  );
}

// node_modules/@shopify/shopify-api/dist/esm/runtime/http/cookies.mjs
var Cookies = class {
  response;
  static parseCookies(hdrs) {
    const entries = hdrs
      .filter((hdr) => hdr.trim().length > 0)
      .map((cookieDef) => {
        const [keyval, ...opts] = cookieDef.split(';');
        const [name, value] = splitN(keyval, '=', 2).map((value2) =>
          value2.trim()
        );
        return [
          name,
          {
            name,
            value,
            ...Object.fromEntries(
              opts.map((opt) =>
                splitN(opt, '=', 2).map((value2) => value2.trim())
              )
            ),
          },
        ];
      });
    const jar = Object.fromEntries(entries);
    for (const cookie of Object.values(jar)) {
      if (typeof cookie.expires === 'string') {
        cookie.expires = new Date(cookie.expires);
      }
    }
    return jar;
  }
  static encodeCookie(data) {
    let result = '';
    result += `${data.name}=${data.value};`;
    result += Object.entries(data)
      .filter(([key]) => !['name', 'value', 'expires'].includes(key))
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
    if (data.expires) {
      result += ';';
      result += `expires=${data.expires.toUTCString()}`;
    }
    return result;
  }
  receivedCookieJar = {};
  outgoingCookieJar = {};
  keys = [];
  constructor(request2, response, { keys = [] } = {}) {
    this.response = response;
    if (keys) this.keys = keys;
    const cookieReqHdr = getHeader(request2.headers, 'Cookie') ?? '';
    this.receivedCookieJar = Cookies.parseCookies(cookieReqHdr.split(';'));
    const cookieResHdr = getHeaders(response.headers, 'Set-Cookie') ?? [];
    this.outgoingCookieJar = Cookies.parseCookies(cookieResHdr);
  }
  toHeaders() {
    return Object.values(this.outgoingCookieJar).map((cookie) =>
      Cookies.encodeCookie(cookie)
    );
  }
  updateHeader() {
    if (!this.response.headers) {
      this.response.headers = {};
    }
    removeHeader(this.response.headers, 'Set-Cookie');
    this.toHeaders().map((hdr) =>
      addHeader(this.response.headers, 'Set-Cookie', hdr)
    );
  }
  get(name) {
    return this.receivedCookieJar[name]?.value;
  }
  deleteCookie(name) {
    this.set(name, '', {
      path: '/',
      expires: /* @__PURE__ */ new Date(0),
    });
  }
  async getAndVerify(name) {
    const value = this.get(name);
    if (!value) return void 0;
    if (!(await this.isSignedCookieValid(name))) {
      return void 0;
    }
    return value;
  }
  get canSign() {
    return this.keys?.length > 0;
  }
  set(name, value, opts = {}) {
    this.outgoingCookieJar[name] = {
      ...opts,
      name,
      value,
    };
    this.updateHeader();
  }
  async setAndSign(name, value, opts = {}) {
    if (!this.canSign) {
      throw Error('No keys provided for signing.');
    }
    this.set(name, value, opts);
    const sigName = `${name}.sig`;
    const signature = await createSHA256HMAC(this.keys[0], value);
    this.set(sigName, signature, opts);
    this.updateHeader();
  }
  async isSignedCookieValid(cookieName) {
    const signedCookieName = `${cookieName}.sig`;
    if (
      !this.cookieExists(cookieName) ||
      !this.cookieExists(signedCookieName)
    ) {
      this.deleteInvalidCookies(cookieName, signedCookieName);
      return false;
    }
    const cookieValue = this.get(cookieName);
    const signature = this.get(signedCookieName);
    if (!cookieValue || !signature) {
      this.deleteInvalidCookies(cookieName, signedCookieName);
      return false;
    }
    const allCheckSignatures = await Promise.all(
      this.keys.map((key) => createSHA256HMAC(key, cookieValue))
    );
    if (!allCheckSignatures.includes(signature)) {
      this.deleteInvalidCookies(cookieName, signedCookieName);
      return false;
    }
    return true;
  }
  cookieExists(cookieName) {
    return Boolean(this.get(cookieName));
  }
  deleteInvalidCookies(...cookieNames) {
    cookieNames.forEach((cookieName) => this.deleteCookie(cookieName));
  }
};

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/const.mjs
var APP_BRIDGE_URL = 'https://cdn.shopify.com/shopifycloud/app-bridge.js';
var REAUTH_URL_HEADER = 'X-Shopify-API-Request-Failure-Reauthorize-Url';
var RETRY_INVALID_SESSION_HEADER = {
  'X-Shopify-Retry-Invalid-Session-Request': '1',
};

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/helpers/app-bridge-url.mjs
var appBridgeUrlOverride;
function setAppBridgeUrlOverride(url) {
  appBridgeUrlOverride = url;
}
function appBridgeUrl() {
  return appBridgeUrlOverride || APP_BRIDGE_URL;
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/adapters/node/index.mjs
import '@remix-run/server-runtime';

// node_modules/isbot/index.mjs
var fullPattern =
  ' daum[ /]| deusu/|(?:^|[^g])news(?!sapphire)|(?<! (?:channel/|google/))google(?!(app|/google| pixel))|(?<! cu)bots?(?:\\b|_)|(?<!(?:lib))http|(?<![hg]m)score|(?<!cam)scan|24x7|@[a-z][\\w-]+\\.|\\(\\)|\\.com\\b|\\bperl\\b|\\btime/|\\||^[\\w \\.\\-\\(?:\\):%]+(?:/v?\\d+(?:\\.\\d+)?(?:\\.\\d{1,10})*?)?(?:,|$)|^[^ ]{50,}$|^\\d+\\b|^\\W|^\\w*search\\b|^\\w+/[\\w\\(\\)]*$|^active|^ad muncher|^amaya|^avsdevicesdk/|^azure|^biglotron|^bot|^bw/|^clamav[ /]|^client/|^cobweb/|^custom|^ddg[_-]android|^discourse|^dispatch/\\d|^downcast/|^duckduckgo|^email|^facebook|^getright/|^gozilla/|^hobbit|^hotzonu|^hwcdn/|^igetter/|^jeode/|^jetty/|^jigsaw|^microsoft bits|^movabletype|^mozilla/\\d\\.\\d\\s[\\w\\.-]+$|^mozilla/\\d\\.\\d\\s\\(compatible;?(?:\\s\\w+\\/\\d+\\.\\d+)?\\)$|^navermailapp|^netsurf|^offline|^openai/|^owler|^php|^postman|^python|^rank|^read|^reed|^rest|^rss|^snapchat|^space bison|^svn|^swcd |^taringa|^thumbor/|^track|^w3c|^webbandit/|^webcopier|^wget|^whatsapp|^wordpress|^xenu link sleuth|^yahoo|^yandex|^zdm/\\d|^zoom marketplace/|agent\\b|analyzer|archive|ask jeeves/teoma|audit|bit\\.ly/|bluecoat drtr|browsex|burpcollaborator|capture|catch|check\\b|checker|chrome-lighthouse|chromeframe|classifier|cloudflare|convertify|crawl|cypress/|dareboost|datanyze|dejaclick|detect|dmbrowser|download|evc-batch/|exaleadcloudview|feed|fetcher|firephp|functionize|grab|headless|httrack|hubspot marketing grader|hydra|ibisbrowser|infrawatch|insight|inspect|iplabel|java(?!;)|library|linkcheck|mail\\.ru/|manager|measure|neustar wpm|node\\b|nutch|offbyone|onetrust|optimize|pageburst|pagespeed|parser|phantomjs|pingdom|powermarks|preview|proxy|ptst[ /]\\d|retriever|rexx;|rigor|rss\\b|scrape|server|sogou|sparkler/|speedcurve|spider|splash|statuscake|supercleaner|synapse|synthetic|tools|torrent|transcoder|url|validator|virtuoso|wappalyzer|webglance|webkit2png|whatcms/|xtate/';
var naivePattern = /bot|crawl|http|lighthouse|scan|search|spider/i;
var pattern;
function getPattern() {
  if (pattern instanceof RegExp) {
    return pattern;
  }
  try {
    pattern = new RegExp(fullPattern, 'i');
  } catch (error) {
    pattern = naivePattern;
  }
  return pattern;
}
function isbot(userAgent) {
  return Boolean(userAgent) && getPattern().test(userAgent);
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/types.mjs
var AppDistribution;
(function (AppDistribution2) {
  AppDistribution2['AppStore'] = 'app_store';
  AppDistribution2['SingleMerchant'] = 'single_merchant';
  AppDistribution2['ShopifyAdmin'] = 'shopify_admin';
})(AppDistribution || (AppDistribution = {}));
var LoginErrorType;
(function (LoginErrorType2) {
  LoginErrorType2['MissingShop'] = 'MISSING_SHOP';
  LoginErrorType2['InvalidShop'] = 'INVALID_SHOP';
})(LoginErrorType || (LoginErrorType = {}));

// node_modules/@shopify/shopify-app-remix/dist/esm/server/adapters/node/index.mjs
setCrypto(crypto2);
setAbstractRuntimeString(() => {
  return `Remix (Node)`;
});
if (process.env.APP_BRIDGE_URL) {
  setAppBridgeUrlOverride(process.env.APP_BRIDGE_URL);
}

// node_modules/@shopify/shopify-api/dist/esm/adapters/web-api/adapter.mjs
async function webApiConvertRequest(adapterArgs) {
  const request2 = adapterArgs.rawRequest;
  const headers = {};
  for (const [key, value] of request2.headers.entries()) {
    addHeader(headers, key, value);
  }
  return {
    headers,
    method: request2.method ?? 'GET',
    url: new URL(request2.url).toString(),
  };
}
async function webApiConvertHeaders(headers, _adapterArgs) {
  const remixHeaders = new Headers();
  flatHeaders(headers ?? {}).forEach(([key, value]) =>
    remixHeaders.append(key, value)
  );
  return Promise.resolve(remixHeaders);
}
async function webApiConvertResponse(resp, adapterArgs) {
  return new Response(resp.body, {
    status: resp.statusCode,
    statusText: resp.statusText,
    headers: await webApiConvertHeaders(resp.headers ?? {}),
  });
}
function webApiRuntimeString() {
  return 'Web API';
}

// node_modules/@shopify/shopify-api/dist/esm/adapters/web-api/index.mjs
setAbstractFetchFunc(fetch);
setAbstractConvertRequestFunc(webApiConvertRequest);
setAbstractConvertResponseFunc(webApiConvertResponse);
setAbstractConvertHeadersFunc(webApiConvertHeaders);
setAbstractRuntimeString(webApiRuntimeString);

// node_modules/@shopify/shopify-api/dist/esm/lib/logger/index.mjs
var import_compare_versions = __toESM(require_umd(), 1);

// node_modules/@shopify/shopify-api/dist/esm/lib/types.mjs
var LogSeverity;
(function (LogSeverity2) {
  LogSeverity2[(LogSeverity2['Error'] = 0)] = 'Error';
  LogSeverity2[(LogSeverity2['Warning'] = 1)] = 'Warning';
  LogSeverity2[(LogSeverity2['Info'] = 2)] = 'Info';
  LogSeverity2[(LogSeverity2['Debug'] = 3)] = 'Debug';
})(LogSeverity || (LogSeverity = {}));
var ApiVersion;
(function (ApiVersion2) {
  ApiVersion2['October22'] = '2022-10';
  ApiVersion2['January23'] = '2023-01';
  ApiVersion2['April23'] = '2023-04';
  ApiVersion2['July23'] = '2023-07';
  ApiVersion2['October23'] = '2023-10';
  ApiVersion2['January24'] = '2024-01';
  ApiVersion2['April24'] = '2024-04';
  ApiVersion2['July24'] = '2024-07';
  ApiVersion2['October24'] = '2024-10';
  ApiVersion2['January25'] = '2025-01';
  ApiVersion2['April25'] = '2025-04';
  ApiVersion2['July25'] = '2025-07';
  ApiVersion2['October25'] = '2025-10';
  ApiVersion2['Unstable'] = 'unstable';
})(ApiVersion || (ApiVersion = {}));
var LIBRARY_NAME = 'Shopify API Library';
var LATEST_API_VERSION = ApiVersion.July25;
var RELEASE_CANDIDATE_API_VERSION = ApiVersion.October25;
var ShopifyHeader;
(function (ShopifyHeader2) {
  ShopifyHeader2['AccessToken'] = 'X-Shopify-Access-Token';
  ShopifyHeader2['ApiVersion'] = 'X-Shopify-API-Version';
  ShopifyHeader2['Domain'] = 'X-Shopify-Shop-Domain';
  ShopifyHeader2['Hmac'] = 'X-Shopify-Hmac-Sha256';
  ShopifyHeader2['Topic'] = 'X-Shopify-Topic';
  ShopifyHeader2['SubTopic'] = 'X-Shopify-Sub-Topic';
  ShopifyHeader2['WebhookId'] = 'X-Shopify-Webhook-Id';
  ShopifyHeader2['StorefrontPrivateToken'] = 'Shopify-Storefront-Private-Token';
  ShopifyHeader2['StorefrontSDKVariant'] = 'X-SDK-Variant';
  ShopifyHeader2['StorefrontSDKVersion'] = 'X-SDK-Version';
})(ShopifyHeader || (ShopifyHeader = {}));
var ClientType;
(function (ClientType2) {
  ClientType2['Rest'] = 'rest';
  ClientType2['Graphql'] = 'graphql';
})(ClientType || (ClientType = {}));
var privacyTopics = [
  'CUSTOMERS_DATA_REQUEST',
  'CUSTOMERS_REDACT',
  'SHOP_REDACT',
];
var BillingInterval;
(function (BillingInterval2) {
  BillingInterval2['OneTime'] = 'ONE_TIME';
  BillingInterval2['Every30Days'] = 'EVERY_30_DAYS';
  BillingInterval2['Annual'] = 'ANNUAL';
  BillingInterval2['Usage'] = 'USAGE';
})(BillingInterval || (BillingInterval = {}));
var BillingReplacementBehavior;
(function (BillingReplacementBehavior2) {
  BillingReplacementBehavior2['ApplyImmediately'] = 'APPLY_IMMEDIATELY';
  BillingReplacementBehavior2['ApplyOnNextBillingCycle'] =
    'APPLY_ON_NEXT_BILLING_CYCLE';
  BillingReplacementBehavior2['Standard'] = 'STANDARD';
})(BillingReplacementBehavior || (BillingReplacementBehavior = {}));

// node_modules/@shopify/shopify-api/dist/esm/lib/version.mjs
var SHOPIFY_API_LIBRARY_VERSION = '11.14.1';

// node_modules/@shopify/shopify-api/dist/esm/lib/logger/log.mjs
function log(config) {
  return function (severity, message2, context = {}) {
    if (severity > config.logger.level) {
      return;
    }
    const prefix = [];
    if (config.logger.timestamps) {
      prefix.push(`${/* @__PURE__ */ new Date().toISOString().slice(0, -5)}Z`);
    }
    let packageString = context.package || 'shopify-api';
    delete context.package;
    switch (severity) {
      case LogSeverity.Debug:
        packageString = `${packageString}/DEBUG`;
        break;
      case LogSeverity.Info:
        packageString = `${packageString}/INFO`;
        break;
      case LogSeverity.Warning:
        packageString = `${packageString}/WARNING`;
        break;
      case LogSeverity.Error:
        packageString = `${packageString}/ERROR`;
        break;
    }
    prefix.push(packageString);
    const contextParts = [];
    Object.entries(context).forEach(([key, value]) => {
      contextParts.push(`${key}: ${value}`);
    });
    let suffix = '';
    if (contextParts.length > 0) {
      suffix = ` | {${contextParts.join(', ')}}`;
    }
    config.logger.log(severity, `[${prefix.join('] [')}] ${message2}${suffix}`);
  };
}

// node_modules/@shopify/shopify-api/dist/esm/lib/logger/index.mjs
function logger(config) {
  const logFunction = log(config);
  return {
    log: logFunction,
    debug: async (message2, context = {}) =>
      logFunction(LogSeverity.Debug, message2, context),
    info: async (message2, context = {}) =>
      logFunction(LogSeverity.Info, message2, context),
    warning: async (message2, context = {}) =>
      logFunction(LogSeverity.Warning, message2, context),
    error: async (message2, context = {}) =>
      logFunction(LogSeverity.Error, message2, context),
    deprecated: deprecated(logFunction),
  };
}
function deprecated(logFunction) {
  return function (version, message2) {
    if (
      (0, import_compare_versions.compare)(
        SHOPIFY_API_LIBRARY_VERSION,
        version,
        '>='
      )
    ) {
      throw new FeatureDeprecatedError(
        `Feature was deprecated in version ${version}`
      );
    }
    return logFunction(
      LogSeverity.Warning,
      `[Deprecated | ${version}] ${message2}`
    );
  };
}

// node_modules/@shopify/shopify-api/dist/esm/rest/load-rest-resources.mjs
function loadRestResources({ resources, config, RestClient: RestClient2 }) {
  const firstResource = Object.keys(resources)[0];
  if (config.apiVersion !== resources[firstResource].apiVersion) {
    logger(config).warning(
      `Loading REST resources for API version ${resources[firstResource].apiVersion}, which doesn't match the default ${config.apiVersion}`
    );
  }
  return Object.fromEntries(
    Object.entries(resources).map(([name, resource]) => {
      class NewResource extends resource {}
      NewResource.setClassProperties({
        Client: RestClient2,
        config,
      });
      Object.entries(NewResource.hasOne).map(([_attribute, klass]) => {
        klass.setClassProperties({
          Client: RestClient2,
          config,
        });
      });
      Object.entries(NewResource.hasMany).map(([_attribute, klass]) => {
        klass.setClassProperties({
          Client: RestClient2,
          config,
        });
      });
      Reflect.defineProperty(NewResource, 'name', {
        value: name,
      });
      return [name, NewResource];
    })
  );
}

// node_modules/@shopify/shopify-api/dist/esm/future/flags.mjs
function logDisabledFutureFlags(config, logger2) {
  if (!config._logDisabledFutureFlags) {
    return;
  }
  const logFlag = (flag, message2) =>
    logger2.info(`Future flag ${flag} is disabled.

  ${message2}
`);
  if (!config.future?.lineItemBilling) {
    logFlag(
      'lineItemBilling',
      'Enable this flag to use the new billing API, that supports multiple line items per plan.'
    );
  }
  if (config.future?.v10_lineItemBilling) {
    logger2.deprecated(
      '12.0.0',
      'v10_lineItemBilling will become enabled in v11. Use flag lineItemBilling instead'
    );
  }
  if (!config.future?.customerAddressDefaultFix) {
    logFlag(
      'customerAddressDefaultFix',
      "Enable this flag to change the CustomerAddress classes to expose a 'is_default' property instead of 'default' when fetching data."
    );
  }
  if (!config.future?.unstable_managedPricingSupport) {
    logFlag(
      'unstable_managedPricingSupport',
      'Enable this flag to support managed pricing, so apps can check for payments without needing a billing config. Learn more at https://shopify.dev/docs/apps/launch/billing/managed-pricing'
    );
  }
}

// node_modules/@shopify/shopify-api/dist/esm/lib/auth/scopes/index.mjs
var _AuthScopes = class {
  compressedScopes;
  expandedScopes;
  originalScopes;
  constructor(scopes) {
    let scopesArray = [];
    if (typeof scopes === 'string') {
      scopesArray = scopes.split(
        new RegExp(`${_AuthScopes.SCOPE_DELIMITER}\\s*`)
      );
    } else if (Array.isArray(scopes)) {
      scopesArray = scopes;
    } else if (scopes) {
      scopesArray = Array.from(scopes.expandedScopes);
    }
    scopesArray = scopesArray
      .map((scope) => scope.trim())
      .filter((scope) => scope.length);
    const impliedScopes = this.getImpliedScopes(scopesArray);
    const scopeSet = new Set(scopesArray);
    const impliedSet = new Set(impliedScopes);
    this.compressedScopes = new Set(
      [...scopeSet].filter((x) => !impliedSet.has(x))
    );
    this.expandedScopes = /* @__PURE__ */ new Set([...scopeSet, ...impliedSet]);
    this.originalScopes = scopeSet;
  }
  /**
   * Checks whether the current set of scopes includes the given one.
   */
  has(scope) {
    let other;
    if (scope instanceof _AuthScopes) {
      other = scope;
    } else {
      other = new _AuthScopes(scope);
    }
    return (
      other.toArray().filter((x) => !this.expandedScopes.has(x)).length === 0
    );
  }
  /**
   * Checks whether the current set of scopes equals the given one.
   */
  equals(otherScopes) {
    let other;
    if (otherScopes instanceof _AuthScopes) {
      other = otherScopes;
    } else {
      other = new _AuthScopes(otherScopes);
    }
    return (
      this.compressedScopes.size === other.compressedScopes.size &&
      this.toArray().filter((x) => !other.has(x)).length === 0
    );
  }
  /**
   * Returns a comma-separated string with the current set of scopes.
   */
  toString() {
    return this.toArray().join(_AuthScopes.SCOPE_DELIMITER);
  }
  /**
   * Returns an array with the current set of scopes.
   */
  toArray(returnOriginalScopes = false) {
    return returnOriginalScopes
      ? [...this.originalScopes]
      : [...this.compressedScopes];
  }
  getImpliedScopes(scopesArray) {
    return scopesArray.reduce((array, current) => {
      const matches = current.match(/^(unauthenticated_)?write_(.*)$/);
      if (matches) {
        array.push(`${matches[1] ? matches[1] : ''}read_${matches[2]}`);
      }
      return array;
    }, []);
  }
};
var AuthScopes = _AuthScopes;
__publicField(AuthScopes, 'SCOPE_DELIMITER', ',');

// node_modules/@shopify/shopify-api/dist/esm/lib/config.mjs
function validateConfig(params) {
  const config = {
    apiKey: '',
    apiSecretKey: '',
    hostName: '',
    hostScheme: 'https',
    apiVersion: LATEST_API_VERSION,
    isEmbeddedApp: true,
    isCustomStoreApp: false,
    logger: {
      log: defaultLogFunction,
      level: LogSeverity.Info,
      httpRequests: false,
      timestamps: false,
    },
    future: {},
    _logDisabledFutureFlags: true,
  };
  const mandatory = ['apiSecretKey', 'hostName'];
  if (!('isCustomStoreApp' in params) || !params.isCustomStoreApp) {
    mandatory.push('apiKey');
  }
  if ('isCustomStoreApp' in params && params.isCustomStoreApp) {
    if (
      !('adminApiAccessToken' in params) ||
      params.adminApiAccessToken?.length === 0
    ) {
      mandatory.push('adminApiAccessToken');
    }
  }
  const missing = [];
  mandatory.forEach((key) => {
    if (!notEmpty(params[key])) {
      missing.push(key);
    }
  });
  if (missing.length) {
    throw new ShopifyError(
      `Cannot initialize Shopify API Library. Missing values for: ${missing.join(', ')}`
    );
  }
  const future = params.future?.v10_lineItemBilling
    ? {
        lineItemBilling: params.future?.v10_lineItemBilling,
        ...params.future,
      }
    : params.future;
  const {
    hostScheme,
    isCustomStoreApp,
    adminApiAccessToken,
    userAgentPrefix,
    logger: logger$1,
    privateAppStorefrontAccessToken,
    customShopDomains,
    billing,
    ...mandatoryParams
  } = params;
  let scopes;
  if (params.scopes === void 0) {
    scopes = void 0;
  } else if (params.scopes instanceof AuthScopes) {
    scopes = params.scopes;
  } else {
    scopes = new AuthScopes(params.scopes);
  }
  Object.assign(config, mandatoryParams, {
    hostName: params.hostName.replace(/\/$/, ''),
    scopes,
    hostScheme: hostScheme ?? config.hostScheme,
    isCustomStoreApp: isCustomStoreApp ?? config.isCustomStoreApp,
    adminApiAccessToken: adminApiAccessToken ?? config.adminApiAccessToken,
    userAgentPrefix: userAgentPrefix ?? config.userAgentPrefix,
    logger: { ...config.logger, ...(logger$1 || {}) },
    privateAppStorefrontAccessToken:
      privateAppStorefrontAccessToken ?? config.privateAppStorefrontAccessToken,
    customShopDomains: customShopDomains ?? config.customShopDomains,
    billing: billing ?? config.billing,
    future: future ?? config.future,
  });
  if (
    config.isCustomStoreApp &&
    params.adminApiAccessToken === params.apiSecretKey
  ) {
    logger(config).warning(
      "adminApiAccessToken is set to the same value as apiSecretKey. adminApiAccessToken should be set to the Admin API access token for custom store apps; apiSecretKey should be set to the custom store app's API secret key."
    );
  }
  return config;
}
function notEmpty(value) {
  if (value == null) {
    return false;
  }
  return typeof value === 'string' || Array.isArray(value)
    ? value.length > 0
    : true;
}
function defaultLogFunction(severity, message2) {
  switch (severity) {
    case LogSeverity.Debug:
      console.debug(message2);
      break;
    case LogSeverity.Info:
      console.log(message2);
      break;
    case LogSeverity.Warning:
      console.warn(message2);
      break;
    case LogSeverity.Error:
      console.error(message2);
      break;
  }
}

// node_modules/@shopify/graphql-client/dist/graphql-client/constants.mjs
var CLIENT = 'GraphQL Client';
var MIN_RETRIES = 0;
var MAX_RETRIES = 3;
var GQL_API_ERROR =
  "An error occurred while fetching from the API. Review 'graphQLErrors' for details.";
var UNEXPECTED_CONTENT_TYPE_ERROR =
  'Response returned unexpected Content-Type:';
var NO_DATA_OR_ERRORS_ERROR =
  'An unknown error has occurred. The API did not return a data object or any errors in its response.';
var CONTENT_TYPES = {
  json: 'application/json',
  multipart: 'multipart/mixed',
};
var SDK_VARIANT_HEADER = 'X-SDK-Variant';
var SDK_VERSION_HEADER = 'X-SDK-Version';
var DEFAULT_SDK_VARIANT = 'shopify-graphql-client';
var DEFAULT_CLIENT_VERSION = '1.4.1';
var RETRY_WAIT_TIME = 1e3;
var RETRIABLE_STATUS_CODES = [429, 503];
var DEFER_OPERATION_REGEX = /@(defer)\b/i;
var NEWLINE_SEPARATOR = '\r\n';
var BOUNDARY_HEADER_REGEX = /boundary="?([^=";]+)"?/i;
var HEADER_SEPARATOR = NEWLINE_SEPARATOR + NEWLINE_SEPARATOR;

// node_modules/@shopify/graphql-client/dist/graphql-client/utilities.mjs
function formatErrorMessage(message2, client = CLIENT) {
  return message2.startsWith(`${client}`) ? message2 : `${client}: ${message2}`;
}
function getErrorMessage(error) {
  return error instanceof Error ? error.message : JSON.stringify(error);
}
function getErrorCause(error) {
  return error instanceof Error && error.cause ? error.cause : void 0;
}
function combineErrors(dataArray) {
  return dataArray.flatMap(({ errors }) => {
    return errors ?? [];
  });
}
function validateRetries({ client, retries }) {
  if (
    retries !== void 0 &&
    (typeof retries !== 'number' ||
      retries < MIN_RETRIES ||
      retries > MAX_RETRIES)
  ) {
    throw new Error(
      `${client}: The provided "retries" value (${retries}) is invalid - it cannot be less than ${MIN_RETRIES} or greater than ${MAX_RETRIES}`
    );
  }
}
function getKeyValueIfValid(key, value) {
  return value &&
    (typeof value !== 'object' ||
      Array.isArray(value) ||
      (typeof value === 'object' && Object.keys(value).length > 0))
    ? { [key]: value }
    : {};
}
function buildDataObjectByPath(path2, data) {
  if (path2.length === 0) {
    return data;
  }
  const key = path2.pop();
  const newData = {
    [key]: data,
  };
  if (path2.length === 0) {
    return newData;
  }
  return buildDataObjectByPath(path2, newData);
}
function combineObjects(baseObject, newObject) {
  return Object.keys(newObject || {}).reduce(
    (acc, key) => {
      if (
        (typeof newObject[key] === 'object' || Array.isArray(newObject[key])) &&
        baseObject[key]
      ) {
        acc[key] = combineObjects(baseObject[key], newObject[key]);
        return acc;
      }
      acc[key] = newObject[key];
      return acc;
    },
    Array.isArray(baseObject) ? [...baseObject] : { ...baseObject }
  );
}
function buildCombinedDataObject([initialDatum, ...remainingData]) {
  return remainingData.reduce(combineObjects, { ...initialDatum });
}

// node_modules/@shopify/graphql-client/dist/graphql-client/http-fetch.mjs
function generateHttpFetch({
  clientLogger,
  customFetchApi = fetch,
  client = CLIENT,
  defaultRetryWaitTime = RETRY_WAIT_TIME,
  retriableCodes = RETRIABLE_STATUS_CODES,
}) {
  const httpFetch = async (requestParams, count, maxRetries) => {
    const nextCount = count + 1;
    const maxTries = maxRetries + 1;
    let response;
    try {
      response = await customFetchApi(...requestParams);
      clientLogger({
        type: 'HTTP-Response',
        content: {
          requestParams,
          response,
        },
      });
      if (
        !response.ok &&
        retriableCodes.includes(response.status) &&
        nextCount <= maxTries
      ) {
        throw new Error();
      }
      const deprecationNotice =
        response?.headers.get('X-Shopify-API-Deprecated-Reason') || '';
      if (deprecationNotice) {
        clientLogger({
          type: 'HTTP-Response-GraphQL-Deprecation-Notice',
          content: {
            requestParams,
            deprecationNotice,
          },
        });
      }
      return response;
    } catch (error) {
      if (nextCount <= maxTries) {
        const retryAfter = response?.headers.get('Retry-After');
        await sleep(
          retryAfter ? parseInt(retryAfter, 10) : defaultRetryWaitTime
        );
        clientLogger({
          type: 'HTTP-Retry',
          content: {
            requestParams,
            lastResponse: response,
            retryAttempt: count,
            maxRetries,
          },
        });
        return httpFetch(requestParams, nextCount, maxRetries);
      }
      throw new Error(
        formatErrorMessage(
          `${maxRetries > 0 ? `Attempted maximum number of ${maxRetries} network retries. Last message - ` : ''}${getErrorMessage(error)}`,
          client
        )
      );
    }
  };
  return httpFetch;
}
async function sleep(waitTime) {
  return new Promise((resolve) => setTimeout(resolve, waitTime));
}

// node_modules/@shopify/graphql-client/dist/graphql-client/graphql-client.mjs
function createGraphQLClient({
  headers,
  url,
  customFetchApi = fetch,
  retries = 0,
  logger: logger2,
}) {
  validateRetries({ client: CLIENT, retries });
  const config = {
    headers,
    url,
    retries,
  };
  const clientLogger = generateClientLogger(logger2);
  const httpFetch = generateHttpFetch({
    customFetchApi,
    clientLogger,
    defaultRetryWaitTime: RETRY_WAIT_TIME,
  });
  const fetchFn = generateFetch(httpFetch, config);
  const request2 = generateRequest(fetchFn);
  const requestStream = generateRequestStream(fetchFn);
  return {
    config,
    fetch: fetchFn,
    request: request2,
    requestStream,
  };
}
function generateClientLogger(logger2) {
  return (logContent) => {
    if (logger2) {
      logger2(logContent);
    }
  };
}
async function processJSONResponse(response) {
  const { errors, data, extensions } = await response.json();
  return {
    ...getKeyValueIfValid('data', data),
    ...getKeyValueIfValid('extensions', extensions),
    headers: response.headers,
    ...(errors || !data
      ? {
          errors: {
            networkStatusCode: response.status,
            message: formatErrorMessage(
              errors ? GQL_API_ERROR : NO_DATA_OR_ERRORS_ERROR
            ),
            ...getKeyValueIfValid('graphQLErrors', errors),
            response,
          },
        }
      : {}),
  };
}
function generateFetch(httpFetch, { url, headers, retries }) {
  return async (operation, options = {}) => {
    const {
      variables,
      headers: overrideHeaders,
      url: overrideUrl,
      retries: overrideRetries,
      keepalive,
      signal,
    } = options;
    const body = JSON.stringify({
      query: operation,
      variables,
    });
    validateRetries({ client: CLIENT, retries: overrideRetries });
    const flatHeaders2 = Object.entries({
      ...headers,
      ...overrideHeaders,
    }).reduce((headers2, [key, value]) => {
      headers2[key] = Array.isArray(value)
        ? value.join(', ')
        : value.toString();
      return headers2;
    }, {});
    if (
      !flatHeaders2[SDK_VARIANT_HEADER] &&
      !flatHeaders2[SDK_VERSION_HEADER]
    ) {
      flatHeaders2[SDK_VARIANT_HEADER] = DEFAULT_SDK_VARIANT;
      flatHeaders2[SDK_VERSION_HEADER] = DEFAULT_CLIENT_VERSION;
    }
    const fetchParams = [
      overrideUrl ?? url,
      {
        method: 'POST',
        headers: flatHeaders2,
        body,
        signal,
        keepalive,
      },
    ];
    return httpFetch(fetchParams, 1, overrideRetries ?? retries);
  };
}
function generateRequest(fetchFn) {
  return async (...props) => {
    if (DEFER_OPERATION_REGEX.test(props[0])) {
      throw new Error(
        formatErrorMessage(
          'This operation will result in a streamable response - use requestStream() instead.'
        )
      );
    }
    let response = null;
    try {
      response = await fetchFn(...props);
      const { status, statusText } = response;
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        return {
          errors: {
            networkStatusCode: status,
            message: formatErrorMessage(statusText),
            response,
          },
        };
      }
      if (!contentType.includes(CONTENT_TYPES.json)) {
        return {
          errors: {
            networkStatusCode: status,
            message: formatErrorMessage(
              `${UNEXPECTED_CONTENT_TYPE_ERROR} ${contentType}`
            ),
            response,
          },
        };
      }
      return await processJSONResponse(response);
    } catch (error) {
      return {
        errors: {
          message: getErrorMessage(error),
          ...(response == null
            ? {}
            : {
                networkStatusCode: response.status,
                response,
              }),
        },
      };
    }
  };
}
async function* getStreamBodyIterator(response) {
  const decoder2 = new TextDecoder();
  if (response.body[Symbol.asyncIterator]) {
    for await (const chunk of response.body) {
      yield decoder2.decode(chunk);
    }
  } else {
    const reader = response.body.getReader();
    let readResult;
    try {
      while (!(readResult = await reader.read()).done) {
        yield decoder2.decode(readResult.value);
      }
    } finally {
      reader.cancel();
    }
  }
}
function readStreamChunk(streamBodyIterator, boundary2) {
  return {
    async *[Symbol.asyncIterator]() {
      try {
        let buffer = '';
        for await (const textChunk of streamBodyIterator) {
          buffer += textChunk;
          if (buffer.indexOf(boundary2) > -1) {
            const lastBoundaryIndex = buffer.lastIndexOf(boundary2);
            const fullResponses = buffer.slice(0, lastBoundaryIndex);
            const chunkBodies = fullResponses
              .split(boundary2)
              .filter((chunk) => chunk.trim().length > 0)
              .map((chunk) => {
                const body = chunk
                  .slice(
                    chunk.indexOf(HEADER_SEPARATOR) + HEADER_SEPARATOR.length
                  )
                  .trim();
                return body;
              });
            if (chunkBodies.length > 0) {
              yield chunkBodies;
            }
            buffer = buffer.slice(lastBoundaryIndex + boundary2.length);
            if (buffer.trim() === `--`) {
              buffer = '';
            }
          }
        }
      } catch (error) {
        throw new Error(
          `Error occured while processing stream payload - ${getErrorMessage(error)}`
        );
      }
    },
  };
}
function createJsonResponseAsyncIterator(response) {
  return {
    async *[Symbol.asyncIterator]() {
      const processedResponse = await processJSONResponse(response);
      yield {
        ...processedResponse,
        hasNext: false,
      };
    },
  };
}
function getResponseDataFromChunkBodies(chunkBodies) {
  return chunkBodies
    .map((value) => {
      try {
        return JSON.parse(value);
      } catch (error) {
        throw new Error(
          `Error in parsing multipart response - ${getErrorMessage(error)}`
        );
      }
    })
    .map((payload) => {
      const { data, incremental, hasNext, extensions, errors } = payload;
      if (!incremental) {
        return {
          data: data || {},
          ...getKeyValueIfValid('errors', errors),
          ...getKeyValueIfValid('extensions', extensions),
          hasNext,
        };
      }
      const incrementalArray = incremental.map(
        ({ data: data2, path: path2, errors: errors2 }) => {
          return {
            data: data2 && path2 ? buildDataObjectByPath(path2, data2) : {},
            ...getKeyValueIfValid('errors', errors2),
          };
        }
      );
      return {
        data:
          incrementalArray.length === 1
            ? incrementalArray[0].data
            : buildCombinedDataObject([
                ...incrementalArray.map(({ data: data2 }) => data2),
              ]),
        ...getKeyValueIfValid('errors', combineErrors(incrementalArray)),
        hasNext,
      };
    });
}
function validateResponseData(responseErrors, combinedData) {
  if (responseErrors.length > 0) {
    throw new Error(GQL_API_ERROR, {
      cause: {
        graphQLErrors: responseErrors,
      },
    });
  }
  if (Object.keys(combinedData).length === 0) {
    throw new Error(NO_DATA_OR_ERRORS_ERROR);
  }
}
function createMultipartResponseAsyncInterator(response, responseContentType) {
  const boundaryHeader = (responseContentType ?? '').match(
    BOUNDARY_HEADER_REGEX
  );
  const boundary2 = `--${boundaryHeader ? boundaryHeader[1] : '-'}`;
  if (!response.body?.getReader && !response.body?.[Symbol.asyncIterator]) {
    throw new Error('API multipart response did not return an iterable body', {
      cause: response,
    });
  }
  const streamBodyIterator = getStreamBodyIterator(response);
  let combinedData = {};
  let responseExtensions;
  return {
    async *[Symbol.asyncIterator]() {
      try {
        let streamHasNext = true;
        for await (const chunkBodies of readStreamChunk(
          streamBodyIterator,
          boundary2
        )) {
          const responseData = getResponseDataFromChunkBodies(chunkBodies);
          responseExtensions =
            responseData.find((datum) => datum.extensions)?.extensions ??
            responseExtensions;
          const responseErrors = combineErrors(responseData);
          combinedData = buildCombinedDataObject([
            combinedData,
            ...responseData.map(({ data }) => data),
          ]);
          streamHasNext = responseData.slice(-1)[0].hasNext;
          validateResponseData(responseErrors, combinedData);
          yield {
            ...getKeyValueIfValid('data', combinedData),
            ...getKeyValueIfValid('extensions', responseExtensions),
            hasNext: streamHasNext,
          };
        }
        if (streamHasNext) {
          throw new Error(`Response stream terminated unexpectedly`);
        }
      } catch (error) {
        const cause = getErrorCause(error);
        yield {
          ...getKeyValueIfValid('data', combinedData),
          ...getKeyValueIfValid('extensions', responseExtensions),
          errors: {
            message: formatErrorMessage(getErrorMessage(error)),
            networkStatusCode: response.status,
            ...getKeyValueIfValid('graphQLErrors', cause?.graphQLErrors),
            response,
          },
          hasNext: false,
        };
      }
    },
  };
}
function generateRequestStream(fetchFn) {
  return async (...props) => {
    if (!DEFER_OPERATION_REGEX.test(props[0])) {
      throw new Error(
        formatErrorMessage(
          'This operation does not result in a streamable response - use request() instead.'
        )
      );
    }
    try {
      const response = await fetchFn(...props);
      const { statusText } = response;
      if (!response.ok) {
        throw new Error(statusText, { cause: response });
      }
      const responseContentType = response.headers.get('content-type') || '';
      switch (true) {
        case responseContentType.includes(CONTENT_TYPES.json):
          return createJsonResponseAsyncIterator(response);
        case responseContentType.includes(CONTENT_TYPES.multipart):
          return createMultipartResponseAsyncInterator(
            response,
            responseContentType
          );
        default:
          throw new Error(
            `${UNEXPECTED_CONTENT_TYPE_ERROR} ${responseContentType}`,
            { cause: response }
          );
      }
    } catch (error) {
      return {
        async *[Symbol.asyncIterator]() {
          const response = getErrorCause(error);
          yield {
            errors: {
              message: formatErrorMessage(getErrorMessage(error)),
              ...getKeyValueIfValid('networkStatusCode', response?.status),
              ...getKeyValueIfValid('response', response),
            },
            hasNext: false,
          };
        },
      };
    }
  };
}

// node_modules/@shopify/graphql-client/dist/api-client-utilities/validations.mjs
function validateDomainAndGetStoreUrl({ client, storeDomain }) {
  try {
    if (!storeDomain || typeof storeDomain !== 'string') {
      throw new Error();
    }
    const trimmedDomain = storeDomain.trim();
    const protocolUrl = trimmedDomain.match(/^https?:/)
      ? trimmedDomain
      : `https://${trimmedDomain}`;
    const url = new URL(protocolUrl);
    url.protocol = 'https';
    return url.origin;
  } catch (error) {
    throw new Error(
      `${client}: a valid store domain ("${storeDomain}") must be provided`,
      { cause: error }
    );
  }
}
function validateApiVersion({
  client,
  currentSupportedApiVersions,
  apiVersion: apiVersion2,
  logger: logger2,
}) {
  const versionError = `${client}: the provided apiVersion ("${apiVersion2}")`;
  const supportedVersion = `Currently supported API versions: ${currentSupportedApiVersions.join(', ')}`;
  if (!apiVersion2 || typeof apiVersion2 !== 'string') {
    throw new Error(`${versionError} is invalid. ${supportedVersion}`);
  }
  const trimmedApiVersion = apiVersion2.trim();
  if (!currentSupportedApiVersions.includes(trimmedApiVersion)) {
    if (logger2) {
      logger2({
        type: 'Unsupported_Api_Version',
        content: {
          apiVersion: apiVersion2,
          supportedApiVersions: currentSupportedApiVersions,
        },
      });
    } else {
      console.warn(
        `${versionError} is likely deprecated or not supported. ${supportedVersion}`
      );
    }
  }
}

// node_modules/@shopify/graphql-client/dist/api-client-utilities/api-versions.mjs
function getQuarterMonth(quarter) {
  const month = quarter * 3 - 2;
  return month === 10 ? month : `0${month}`;
}
function getPrevousVersion(year2, quarter, nQuarter) {
  const versionQuarter = quarter - nQuarter;
  if (versionQuarter <= 0) {
    return `${year2 - 1}-${getQuarterMonth(versionQuarter + 4)}`;
  }
  return `${year2}-${getQuarterMonth(versionQuarter)}`;
}
function getCurrentApiVersion() {
  const date = /* @__PURE__ */ new Date();
  const month = date.getUTCMonth();
  const year2 = date.getUTCFullYear();
  const quarter = Math.floor(month / 3 + 1);
  return {
    year: year2,
    quarter,
    version: `${year2}-${getQuarterMonth(quarter)}`,
  };
}
function getCurrentSupportedApiVersions() {
  const {
    year: year2,
    quarter,
    version: currentVersion,
  } = getCurrentApiVersion();
  const nextVersion =
    quarter === 4
      ? `${year2 + 1}-01`
      : `${year2}-${getQuarterMonth(quarter + 1)}`;
  return [
    getPrevousVersion(year2, quarter, 3),
    getPrevousVersion(year2, quarter, 2),
    getPrevousVersion(year2, quarter, 1),
    currentVersion,
    nextVersion,
    'unstable',
  ];
}

// node_modules/@shopify/graphql-client/dist/api-client-utilities/utilities.mjs
function generateGetHeaders(config) {
  return (customHeaders) => {
    return { ...(customHeaders ?? {}), ...config.headers };
  };
}
function generateGetGQLClientParams({ getHeaders: getHeaders2, getApiUrl }) {
  return (operation, options) => {
    const props = [operation];
    if (options && Object.keys(options).length > 0) {
      const {
        variables,
        apiVersion: propApiVersion,
        headers,
        retries,
        signal,
      } = options;
      props.push({
        ...(variables ? { variables } : {}),
        ...(headers ? { headers: getHeaders2(headers) } : {}),
        ...(propApiVersion ? { url: getApiUrl(propApiVersion) } : {}),
        ...(retries ? { retries } : {}),
        ...(signal ? { signal } : {}),
      });
    }
    return props;
  };
}

// node_modules/@shopify/admin-api-client/dist/constants.mjs
var DEFAULT_CONTENT_TYPE = 'application/json';
var DEFAULT_CLIENT_VERSION2 = '1.1.1';
var ACCESS_TOKEN_HEADER = 'X-Shopify-Access-Token';
var CLIENT2 = 'Admin API Client';
var RETRIABLE_STATUS_CODES2 = [429, 500, 503];
var DEFAULT_RETRY_WAIT_TIME = 1e3;

// node_modules/@shopify/admin-api-client/dist/validations.mjs
function validateRequiredAccessToken(accessToken) {
  if (!accessToken) {
    throw new Error(`${CLIENT2}: an access token must be provided`);
  }
}
function validateServerSideUsage(isTesting = false) {
  if (typeof window !== 'undefined' && !isTesting) {
    throw new Error(
      `${CLIENT2}: this client should not be used in the browser`
    );
  }
}

// node_modules/@shopify/admin-api-client/dist/graphql/client.mjs
function createAdminApiClient({
  storeDomain,
  apiVersion: apiVersion2,
  accessToken,
  userAgentPrefix,
  retries = 0,
  customFetchApi,
  logger: logger2,
  isTesting,
}) {
  const currentSupportedApiVersions = getCurrentSupportedApiVersions();
  const storeUrl = validateDomainAndGetStoreUrl({
    client: CLIENT2,
    storeDomain,
  });
  const baseApiVersionValidationParams = {
    client: CLIENT2,
    currentSupportedApiVersions,
    logger: logger2,
  };
  validateServerSideUsage(isTesting);
  validateApiVersion({
    client: CLIENT2,
    currentSupportedApiVersions,
    apiVersion: apiVersion2,
    logger: logger2,
  });
  validateRequiredAccessToken(accessToken);
  const apiUrlFormatter = generateApiUrlFormatter(
    storeUrl,
    apiVersion2,
    baseApiVersionValidationParams
  );
  const config = {
    storeDomain: storeUrl,
    apiVersion: apiVersion2,
    accessToken,
    headers: {
      'Content-Type': DEFAULT_CONTENT_TYPE,
      Accept: DEFAULT_CONTENT_TYPE,
      [ACCESS_TOKEN_HEADER]: accessToken,
      'User-Agent': `${userAgentPrefix ? `${userAgentPrefix} | ` : ''}${CLIENT2} v${DEFAULT_CLIENT_VERSION2}`,
    },
    apiUrl: apiUrlFormatter(),
    userAgentPrefix,
  };
  const graphqlClient = createGraphQLClient({
    headers: config.headers,
    url: config.apiUrl,
    retries,
    customFetchApi,
    logger: logger2,
  });
  const getHeaders2 = generateGetHeaders(config);
  const getApiUrl = generateGetApiUrl(config, apiUrlFormatter);
  const getGQLClientParams = generateGetGQLClientParams({
    getHeaders: getHeaders2,
    getApiUrl,
  });
  const client = {
    config,
    getHeaders: getHeaders2,
    getApiUrl,
    fetch: (...props) => {
      return graphqlClient.fetch(...getGQLClientParams(...props));
    },
    request: (...props) => {
      return graphqlClient.request(...getGQLClientParams(...props));
    },
  };
  return Object.freeze(client);
}
function generateApiUrlFormatter(
  storeUrl,
  defaultApiVersion,
  baseApiVersionValidationParams
) {
  return (apiVersion2) => {
    if (apiVersion2) {
      validateApiVersion({
        ...baseApiVersionValidationParams,
        apiVersion: apiVersion2,
      });
    }
    const urlApiVersion = (apiVersion2 ?? defaultApiVersion).trim();
    return `${storeUrl}/admin/api/${urlApiVersion}/graphql.json`;
  };
}
function generateGetApiUrl(config, apiUrlFormatter) {
  return (propApiVersion) => {
    return propApiVersion ? apiUrlFormatter(propApiVersion) : config.apiUrl;
  };
}

// node_modules/@shopify/admin-api-client/dist/rest/types.mjs
var Method;
(function (Method3) {
  Method3['Get'] = 'GET';
  Method3['Post'] = 'POST';
  Method3['Put'] = 'PUT';
  Method3['Delete'] = 'DELETE';
})(Method || (Method = {}));

// node_modules/@shopify/admin-api-client/dist/rest/client.mjs
function createAdminRestApiClient({
  storeDomain,
  apiVersion: apiVersion2,
  accessToken,
  userAgentPrefix,
  logger: logger2,
  customFetchApi = fetch,
  retries: clientRetries = 0,
  scheme = 'https',
  defaultRetryTime = DEFAULT_RETRY_WAIT_TIME,
  formatPaths = true,
  isTesting,
}) {
  const currentSupportedApiVersions = getCurrentSupportedApiVersions();
  const storeUrl = validateDomainAndGetStoreUrl({
    client: CLIENT2,
    storeDomain,
  }).replace('https://', `${scheme}://`);
  const baseApiVersionValidationParams = {
    client: CLIENT2,
    currentSupportedApiVersions,
    logger: logger2,
  };
  validateServerSideUsage(isTesting);
  validateApiVersion({
    client: CLIENT2,
    currentSupportedApiVersions,
    apiVersion: apiVersion2,
    logger: logger2,
  });
  validateRequiredAccessToken(accessToken);
  validateRetries({ client: CLIENT2, retries: clientRetries });
  const apiUrlFormatter = generateApiUrlFormatter2(
    storeUrl,
    apiVersion2,
    baseApiVersionValidationParams,
    formatPaths
  );
  const clientLogger = generateClientLogger2(logger2);
  const httpFetch = generateHttpFetch({
    customFetchApi,
    clientLogger,
    defaultRetryWaitTime: defaultRetryTime,
    client: CLIENT2,
    retriableCodes: RETRIABLE_STATUS_CODES2,
  });
  const request2 = async (
    path2,
    {
      method,
      data,
      headers: requestHeadersObj,
      searchParams,
      retries = 0,
      apiVersion: apiVersion3,
    }
  ) => {
    validateRetries({ client: CLIENT2, retries });
    const url = apiUrlFormatter(path2, searchParams ?? {}, apiVersion3);
    const requestHeaders = normalizedHeaders(requestHeadersObj ?? {});
    const userAgent = [
      ...(requestHeaders['user-agent'] ? [requestHeaders['user-agent']] : []),
      ...(userAgentPrefix ? [userAgentPrefix] : []),
      `${CLIENT2} v${DEFAULT_CLIENT_VERSION2}`,
    ].join(' | ');
    const headers = normalizedHeaders({
      'Content-Type': DEFAULT_CONTENT_TYPE,
      ...requestHeaders,
      Accept: DEFAULT_CONTENT_TYPE,
      [ACCESS_TOKEN_HEADER]: accessToken,
      'User-Agent': userAgent,
    });
    const body = data && typeof data !== 'string' ? JSON.stringify(data) : data;
    return httpFetch(
      [url, { method, headers, ...(body ? { body } : void 0) }],
      1,
      retries ?? clientRetries
    );
  };
  return {
    get: (path2, options) =>
      request2(path2, { method: Method.Get, ...options }),
    put: (path2, options) =>
      request2(path2, { method: Method.Put, ...options }),
    post: (path2, options) =>
      request2(path2, { method: Method.Post, ...options }),
    delete: (path2, options) =>
      request2(path2, { method: Method.Delete, ...options }),
  };
}
function generateApiUrlFormatter2(
  storeUrl,
  defaultApiVersion,
  baseApiVersionValidationParams,
  formatPaths = true
) {
  return (path2, searchParams, apiVersion2) => {
    if (apiVersion2) {
      validateApiVersion({
        ...baseApiVersionValidationParams,
        apiVersion: apiVersion2,
      });
    }
    function convertValue(params2, key, value) {
      if (Array.isArray(value)) {
        value.forEach((arrayValue) =>
          convertValue(params2, `${key}[]`, arrayValue)
        );
        return;
      } else if (typeof value === 'object') {
        Object.entries(value).forEach(([objKey, objValue]) =>
          convertValue(params2, `${key}[${objKey}]`, objValue)
        );
        return;
      }
      params2.append(key, String(value));
    }
    const urlApiVersion = (apiVersion2 ?? defaultApiVersion).trim();
    let cleanPath = path2.replace(/^\//, '');
    if (formatPaths) {
      if (!cleanPath.startsWith('admin')) {
        cleanPath = `admin/api/${urlApiVersion}/${cleanPath}`;
      }
      if (!cleanPath.endsWith('.json')) {
        cleanPath = `${cleanPath}.json`;
      }
    }
    const params = new URLSearchParams();
    if (searchParams) {
      for (const [key, value] of Object.entries(searchParams)) {
        convertValue(params, key, value);
      }
    }
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return `${storeUrl}/${cleanPath}${queryString}`;
  };
}
function generateClientLogger2(logger2) {
  return (logContent) => {
    if (logger2) {
      logger2(logContent);
    }
  };
}
function normalizedHeaders(headersObj) {
  const normalizedHeaders2 = {};
  for (const [key, value] of Object.entries(headersObj)) {
    normalizedHeaders2[key.toLowerCase()] = Array.isArray(value)
      ? value.join(', ')
      : String(value);
  }
  return normalizedHeaders2;
}

// node_modules/@shopify/network/build/esm/network.mjs
var Method2;
(function (Method3) {
  Method3['Get'] = 'GET';
  Method3['Post'] = 'POST';
  Method3['Put'] = 'PUT';
  Method3['Patch'] = 'PATCH';
  Method3['Delete'] = 'DELETE';
  Method3['Head'] = 'HEAD';
  Method3['Options'] = 'OPTIONS';
  Method3['Connect'] = 'CONNECT';
})(Method2 || (Method2 = {}));
var StatusCode;
(function (StatusCode2) {
  StatusCode2[(StatusCode2['Continue'] = 100)] = 'Continue';
  StatusCode2[(StatusCode2['SwitchingProtocols'] = 101)] = 'SwitchingProtocols';
  StatusCode2[(StatusCode2['Ok'] = 200)] = 'Ok';
  StatusCode2[(StatusCode2['Created'] = 201)] = 'Created';
  StatusCode2[(StatusCode2['Accepted'] = 202)] = 'Accepted';
  StatusCode2[(StatusCode2['NonAuthoritativeInformation'] = 203)] =
    'NonAuthoritativeInformation';
  StatusCode2[(StatusCode2['NoContent'] = 204)] = 'NoContent';
  StatusCode2[(StatusCode2['ResetContent'] = 205)] = 'ResetContent';
  StatusCode2[(StatusCode2['PartialContent'] = 206)] = 'PartialContent';
  StatusCode2[(StatusCode2['MultipleChoices'] = 300)] = 'MultipleChoices';
  StatusCode2[(StatusCode2['MovedPermanently'] = 301)] = 'MovedPermanently';
  StatusCode2[(StatusCode2['Found'] = 302)] = 'Found';
  StatusCode2[(StatusCode2['SeeOther'] = 303)] = 'SeeOther';
  StatusCode2[(StatusCode2['NotModified'] = 304)] = 'NotModified';
  StatusCode2[(StatusCode2['UseProxy'] = 305)] = 'UseProxy';
  StatusCode2[(StatusCode2['TemporaryRedirect'] = 307)] = 'TemporaryRedirect';
  StatusCode2[(StatusCode2['BadRequest'] = 400)] = 'BadRequest';
  StatusCode2[(StatusCode2['Unauthorized'] = 401)] = 'Unauthorized';
  StatusCode2[(StatusCode2['PaymentRequired'] = 402)] = 'PaymentRequired';
  StatusCode2[(StatusCode2['Forbidden'] = 403)] = 'Forbidden';
  StatusCode2[(StatusCode2['NotFound'] = 404)] = 'NotFound';
  StatusCode2[(StatusCode2['MethodNotAllowed'] = 405)] = 'MethodNotAllowed';
  StatusCode2[(StatusCode2['NotAcceptable'] = 406)] = 'NotAcceptable';
  StatusCode2[(StatusCode2['ProxyAuthenticationRequired'] = 407)] =
    'ProxyAuthenticationRequired';
  StatusCode2[(StatusCode2['RequestTimeout'] = 408)] = 'RequestTimeout';
  StatusCode2[(StatusCode2['Conflict'] = 409)] = 'Conflict';
  StatusCode2[(StatusCode2['Gone'] = 410)] = 'Gone';
  StatusCode2[(StatusCode2['LengthRequired'] = 411)] = 'LengthRequired';
  StatusCode2[(StatusCode2['PreconditionFailed'] = 412)] = 'PreconditionFailed';
  StatusCode2[(StatusCode2['RequestEntityTooLarge'] = 413)] =
    'RequestEntityTooLarge';
  StatusCode2[(StatusCode2['RequestUriTooLong'] = 414)] = 'RequestUriTooLong';
  StatusCode2[(StatusCode2['UnsupportedMediaType'] = 415)] =
    'UnsupportedMediaType';
  StatusCode2[(StatusCode2['RequestedRangeNotSatisfiable'] = 416)] =
    'RequestedRangeNotSatisfiable';
  StatusCode2[(StatusCode2['ExpectationFailed'] = 417)] = 'ExpectationFailed';
  StatusCode2[(StatusCode2['ImATeapot'] = 418)] = 'ImATeapot';
  StatusCode2[(StatusCode2['UnprocessableEntity'] = 422)] =
    'UnprocessableEntity';
  StatusCode2[(StatusCode2['TooManyRequests'] = 429)] = 'TooManyRequests';
  StatusCode2[(StatusCode2['InternalServerError'] = 500)] =
    'InternalServerError';
  StatusCode2[(StatusCode2['NotImplemented'] = 501)] = 'NotImplemented';
  StatusCode2[(StatusCode2['BadGateway'] = 502)] = 'BadGateway';
  StatusCode2[(StatusCode2['ServiceUnavailable'] = 503)] = 'ServiceUnavailable';
  StatusCode2[(StatusCode2['GatewayTimeout'] = 504)] = 'GatewayTimeout';
  StatusCode2[(StatusCode2['HttpVersionNotSupported'] = 505)] =
    'HttpVersionNotSupported';
})(StatusCode || (StatusCode = {}));
var Header;
(function (Header2) {
  Header2['Accept'] = 'Accept';
  Header2['AcceptEncoding'] = 'Accept-Encoding';
  Header2['AcceptLanguage'] = 'Accept-Language';
  Header2['AccessControlAllowCredentials'] = 'Access-Control-Allow-Credentials';
  Header2['AccessControlAllowHeaders'] = 'Access-Control-Allow-Headers';
  Header2['AccessControlAllowMethods'] = 'Access-Control-Allow-Methods';
  Header2['AccessControlAllowOrigin'] = 'Access-Control-Allow-Origin';
  Header2['AccessControlExposeHeaders'] = 'Access-Control-Expose-Headers';
  Header2['AccessControlMaxAge'] = 'Access-Control-Max-Age';
  Header2['AccessControlRequestHeaders'] = 'Access-Control-Request-Headers';
  Header2['AccessControlRequestMethod'] = 'Access-Control-Request-Method';
  Header2['Authorization'] = 'Authorization';
  Header2['CacheControl'] = 'Cache-Control';
  Header2['CacheStatus'] = 'Cache-Status';
  Header2['Connection'] = 'Connection';
  Header2['ContentDisposition'] = 'Content-Disposition';
  Header2['ContentEncoding'] = 'Content-Encoding';
  Header2['ContentLength'] = 'Content-Length';
  Header2['ContentSecurityPolicy'] = 'Content-Security-Policy';
  Header2['ContentSecurityPolicyReportOnly'] =
    'Content-Security-Policy-Report-Only';
  Header2['ContentType'] = 'Content-Type';
  Header2['ContentTypeOptions'] = 'X-Content-Type-Options';
  Header2['Cookie'] = 'Cookie';
  Header2['DownloadOptions'] = 'X-Download-Options';
  Header2['ETag'] = 'ETag';
  Header2['Forwarded'] = 'Forwarded';
  Header2['ForwardedFor'] = 'X-Forwarded-For';
  Header2['ForwardedHost'] = 'X-Forwarded-Host';
  Header2['ForwardedProtocol'] = 'X-Forwarded-Proto';
  Header2['FrameOptions'] = 'X-Frame-Options';
  Header2['Host'] = 'Host';
  Header2['IfNoneMatch'] = 'If-None-Match';
  Header2['Location'] = 'Location';
  Header2['Origin'] = 'Origin';
  Header2['ReferrerPolicy'] = 'Referrer-Policy';
  Header2['ServerTiming'] = 'Server-Timing';
  Header2['StrictTransportSecurity'] = 'Strict-Transport-Security';
  Header2['TimingAllowOrigin'] = 'Timing-Allow-Origin';
  Header2['Trailer'] = 'Trailer';
  Header2['TransferEncoding'] = 'Transfer-Encoding';
  Header2['UserAgent'] = 'User-Agent';
  Header2['WwwAuthenticate'] = 'WWW-Authenticate';
  Header2['XhrRedirectedTo'] = 'X-XHR-Redirected-To';
  Header2['XhrReferer'] = 'X-XHR-Referer';
  Header2['XssProtecton'] = 'X-XSS-Protection';
  Header2['XContentTypeOptions'] = 'X-Content-Type-Options';
  Header2['XDownloadOptions'] = 'X-Download-Options';
  Header2['XForwardedFor'] = 'X-Forwarded-For';
  Header2['XForwardedHost'] = 'X-Forwarded-Host';
  Header2['XForwardedProto'] = 'X-Forwarded-Proto';
  Header2['XFrameOptions'] = 'X-Frame-Options';
  Header2['XXhrRedirectedTo'] = 'X-XHR-Redirected-To';
  Header2['XXhrReferer'] = 'X-XHR-Referer';
  Header2['XXssProtecton'] = 'X-XSS-Protection';
  Header2['XXssProtection'] = 'X-XSS-Protection';
})(Header || (Header = {}));
var CspDirective;
(function (CspDirective2) {
  CspDirective2['ChildSrc'] = 'child-src';
  CspDirective2['ConnectSrc'] = 'connect-src';
  CspDirective2['DefaultSrc'] = 'default-src';
  CspDirective2['FontSrc'] = 'font-src';
  CspDirective2['FrameSrc'] = 'frame-src';
  CspDirective2['ImgSrc'] = 'img-src';
  CspDirective2['ManifestSrc'] = 'manifest-src';
  CspDirective2['MediaSrc'] = 'media-src';
  CspDirective2['ObjectSrc'] = 'object-src';
  CspDirective2['PrefetchSrc'] = 'prefetch-src';
  CspDirective2['ScriptSrc'] = 'script-src';
  CspDirective2['StyleSrc'] = 'style-src';
  CspDirective2['WebrtcSrc'] = 'webrtc-src';
  CspDirective2['WorkerSrc'] = 'worker-src';
  CspDirective2['BaseUri'] = 'base-uri';
  CspDirective2['PluginTypes'] = 'plugin-types';
  CspDirective2['Sandbox'] = 'sandbox';
  CspDirective2['FormAction'] = 'form-action';
  CspDirective2['FrameAncestors'] = 'frame-ancestors';
  CspDirective2['ReportUri'] = 'report-uri';
  CspDirective2['BlockAllMixedContent'] = 'block-all-mixed-content';
  CspDirective2['RequireSriFor'] = 'require-sri-for';
  CspDirective2['UpgradeInsecureRequests'] = 'upgrade-insecure-requests';
})(CspDirective || (CspDirective = {}));
var CspSandboxAllow;
(function (CspSandboxAllow2) {
  CspSandboxAllow2['Forms'] = 'allow-forms';
  CspSandboxAllow2['SameOrigin'] = 'allow-same-origin';
  CspSandboxAllow2['Scripts'] = 'allow-scripts';
  CspSandboxAllow2['Popups'] = 'allow-popups';
  CspSandboxAllow2['Modals'] = 'allow-modals';
  CspSandboxAllow2['OrientationLock'] = 'allow-orientation-lock';
  CspSandboxAllow2['PointerLock'] = 'allow-pointer-lock';
  CspSandboxAllow2['Presentation'] = 'allow-presentation';
  CspSandboxAllow2['PopupsToEscapeSandbox'] = 'allow-popups-to-escape-sandbox';
  CspSandboxAllow2['TopNavigation'] = 'allow-top-navigation';
})(CspSandboxAllow || (CspSandboxAllow = {}));
var SpecialSource;
(function (SpecialSource2) {
  SpecialSource2['Any'] = '*';
  SpecialSource2['Self'] = "'self'";
  SpecialSource2['UnsafeInline'] = "'unsafe-inline'";
  SpecialSource2['UnsafeEval'] = "'unsafe-eval'";
  SpecialSource2['None'] = "'none'";
  SpecialSource2['StrictDynamic'] = "'strict-dynamic'";
  SpecialSource2['ReportSample'] = "'report-sample'";
  SpecialSource2['Data'] = 'data:';
  SpecialSource2['Blob'] = 'blob:';
  SpecialSource2['FileSystem'] = 'filesystem:';
})(SpecialSource || (SpecialSource = {}));
var SriAsset;
(function (SriAsset2) {
  SriAsset2['Script'] = 'script';
  SriAsset2['Style'] = 'style';
})(SriAsset || (SriAsset = {}));
var HashAlgorithm;
(function (HashAlgorithm2) {
  HashAlgorithm2['Sha256'] = 'sha256';
  HashAlgorithm2['Sha384'] = 'sha384';
  HashAlgorithm2['Sha512'] = 'sha512';
})(HashAlgorithm || (HashAlgorithm = {}));
var ResponseType;
(function (ResponseType2) {
  ResponseType2['Informational'] = '1xx';
  ResponseType2['Success'] = '2xx';
  ResponseType2['Redirection'] = '3xx';
  ResponseType2['ClientError'] = '4xx';
  ResponseType2['ServerError'] = '5xx';
  ResponseType2['Unknown'] = 'Unknown';
})(ResponseType || (ResponseType = {}));
var CacheControl;
(function (CacheControl2) {
  CacheControl2['NoCache'] = 'no-cache';
  CacheControl2['NoStore'] = 'no-store';
  CacheControl2['MustRevalidate'] = 'must-revalidate';
  CacheControl2['MaxAge'] = 'max-age';
})(CacheControl || (CacheControl = {}));
var noCache = `${CacheControl.NoCache},${CacheControl.NoStore},${CacheControl.MustRevalidate},${CacheControl.MaxAge}=0`;

// node_modules/@shopify/shopify-api/dist/esm/lib/clients/common.mjs
function getUserAgent(config) {
  let userAgentPrefix = `${LIBRARY_NAME} v${SHOPIFY_API_LIBRARY_VERSION} | ${abstractRuntimeString()}`;
  if (config.userAgentPrefix) {
    userAgentPrefix = `${config.userAgentPrefix} | ${userAgentPrefix}`;
  }
  return userAgentPrefix;
}
function serializeResponse(response) {
  if (!response) {
    return { error: 'No response object provided' };
  }
  try {
    const { status, statusText, ok, redirected, type, url, headers } = response;
    const serialized = {
      status,
      statusText,
      ok,
      redirected,
      type,
      url,
    };
    if (headers?.entries) {
      serialized.headers = Object.fromEntries(headers.entries());
    } else if (headers) {
      serialized.headers = headers;
    }
    return serialized;
  } catch {
    return response;
  }
}
function clientLoggerFactory(config) {
  return (logContent) => {
    if (config.logger.httpRequests) {
      switch (logContent.type) {
        case 'HTTP-Response': {
          const responseLog = logContent.content;
          logger(config).debug('Received response for HTTP request', {
            requestParams: JSON.stringify(responseLog.requestParams),
            response: JSON.stringify(serializeResponse(responseLog.response)),
          });
          break;
        }
        case 'HTTP-Retry': {
          const responseLog = logContent.content;
          logger(config).debug('Retrying HTTP request', {
            requestParams: JSON.stringify(responseLog.requestParams),
            retryAttempt: responseLog.retryAttempt,
            maxRetries: responseLog.maxRetries,
            response: responseLog.lastResponse
              ? JSON.stringify(serializeResponse(responseLog.lastResponse))
              : 'undefined',
          });
          break;
        }
        case 'HTTP-Response-GraphQL-Deprecation-Notice': {
          const responseLog = logContent.content;
          logger(config).debug(
            'Received response containing Deprecated GraphQL Notice',
            {
              requestParams: JSON.stringify(responseLog.requestParams),
              deprecationNotice: responseLog.deprecationNotice,
            }
          );
          break;
        }
        default: {
          logger(config).debug(`HTTP request event: ${logContent.content}`);
          break;
        }
      }
    }
  };
}
function throwFailedRequest(body, atMaxRetries, response) {
  if (typeof response === 'undefined') {
    const message2 = body?.errors?.message ?? '';
    throw new HttpRequestError(
      `Http request error, no response available: ${message2}`
    );
  }
  const responseHeaders = canonicalizeHeaders(
    Object.fromEntries(response.headers.entries() ?? [])
  );
  if (response.status === StatusCode.Ok && body.errors.graphQLErrors) {
    throw new GraphqlQueryError({
      message:
        body.errors.graphQLErrors?.[0].message ?? 'GraphQL operation failed',
      response,
      headers: responseHeaders,
      body,
    });
  }
  const errorMessages = [];
  if (body.errors) {
    errorMessages.push(JSON.stringify(body.errors, null, 2));
  }
  const xRequestId = getHeader(responseHeaders, 'x-request-id');
  if (xRequestId) {
    errorMessages.push(
      `If you report this error, please include this id: ${xRequestId}`
    );
  }
  const errorMessage = errorMessages.length
    ? `:
${errorMessages.join('\n')}`
    : '';
  const code = response.status;
  const statusText = response.statusText;
  switch (true) {
    case response.status === StatusCode.TooManyRequests: {
      if (atMaxRetries) {
        throw new HttpMaxRetriesError(
          'Attempted the maximum number of retries for HTTP request.'
        );
      } else {
        const retryAfter = getHeader(responseHeaders, 'Retry-After');
        throw new HttpThrottlingError({
          message: `Shopify is throttling requests ${errorMessage}`,
          code,
          statusText,
          body,
          headers: responseHeaders,
          retryAfter: retryAfter ? parseFloat(retryAfter) : void 0,
        });
      }
    }
    case response.status >= StatusCode.InternalServerError:
      if (atMaxRetries) {
        throw new HttpMaxRetriesError(
          'Attempted the maximum number of retries for HTTP request.'
        );
      } else {
        throw new HttpInternalError({
          message: `Shopify internal error${errorMessage}`,
          code,
          statusText,
          body,
          headers: responseHeaders,
        });
      }
    default:
      throw new HttpResponseError({
        message: `Received an error response (${response.status} ${response.statusText}) from Shopify${errorMessage}`,
        code,
        statusText,
        body,
        headers: responseHeaders,
      });
  }
}

// node_modules/@shopify/shopify-api/dist/esm/lib/clients/admin/graphql/client.mjs
var GraphqlClient = class {
  session;
  client;
  apiVersion;
  constructor(params) {
    const config = this.graphqlClass().config;
    if (!config.isCustomStoreApp && !params.session.accessToken) {
      throw new MissingRequiredArgument(
        'Missing access token when creating GraphQL client'
      );
    }
    if (params.apiVersion) {
      const message2 =
        params.apiVersion === config.apiVersion
          ? `Admin client has a redundant API version override to the default ${params.apiVersion}`
          : `Admin client overriding default API version ${config.apiVersion} with ${params.apiVersion}`;
      logger(config).debug(message2);
    }
    this.session = params.session;
    this.apiVersion = params.apiVersion;
    this.client = createAdminApiClient({
      accessToken: config.adminApiAccessToken ?? this.session.accessToken,
      apiVersion: this.apiVersion ?? config.apiVersion,
      storeDomain: this.session.shop,
      customFetchApi: abstractFetch,
      logger: clientLoggerFactory(config),
      userAgentPrefix: getUserAgent(config),
      isTesting: config.isTesting,
    });
  }
  async query(params) {
    logger(this.graphqlClass().config).deprecated(
      '12.0.0',
      'The query method is deprecated, and was replaced with the request method.\nSee the migration guide: https://github.com/Shopify/shopify-app-js/blob/main/packages/apps/shopify-api/docs/migrating-to-v9.md#using-the-new-clients.'
    );
    if (
      (typeof params.data === 'string' && params.data.length === 0) ||
      Object.entries(params.data).length === 0
    ) {
      throw new MissingRequiredArgument('Query missing.');
    }
    let operation;
    let variables;
    if (typeof params.data === 'string') {
      operation = params.data;
    } else {
      operation = params.data.query;
      variables = params.data.variables;
    }
    const headers = Object.fromEntries(
      Object.entries(params?.extraHeaders ?? {}).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(', ') : value.toString(),
      ])
    );
    const response = await this.request(operation, {
      headers,
      retries: params.tries ? params.tries - 1 : void 0,
      variables,
    });
    return { body: response, headers: {} };
  }
  async request(operation, options) {
    const response = await this.client.request(operation, {
      apiVersion: this.apiVersion || this.graphqlClass().config.apiVersion,
      ...options,
    });
    if (response.errors) {
      const fetchResponse = response.errors.response;
      throwFailedRequest(response, (options?.retries ?? 0) > 0, fetchResponse);
    }
    const headerObject = Object.fromEntries(
      response.headers ? response.headers.entries() : []
    );
    return {
      ...response,
      headers: canonicalizeHeaders(headerObject ?? {}),
    };
  }
  graphqlClass() {
    return this.constructor;
  }
};
__publicField(GraphqlClient, 'config');
function graphqlClientClass({ config }) {
  class NewGraphqlClient extends GraphqlClient {
    static config = config;
  }
  Reflect.defineProperty(NewGraphqlClient, 'name', {
    value: 'GraphqlClient',
  });
  return NewGraphqlClient;
}

// node_modules/@shopify/shopify-api/dist/esm/lib/clients/admin/rest/client.mjs
var _RestClient = class {
  loggedDeprecations = {};
  client;
  session;
  apiVersion;
  constructor({ session, apiVersion: apiVersion2 }) {
    const config = this.restClass().config;
    if (!config.isCustomStoreApp && !session.accessToken) {
      throw new MissingRequiredArgument(
        'Missing access token when creating REST client'
      );
    }
    if (apiVersion2) {
      const message2 =
        apiVersion2 === config.apiVersion
          ? `REST client has a redundant API version override to the default ${apiVersion2}`
          : `REST client overriding default API version ${config.apiVersion} with ${apiVersion2}`;
      logger(config).debug(message2);
    }
    const customStoreAppAccessToken =
      config.adminApiAccessToken ?? config.apiSecretKey;
    this.session = session;
    this.apiVersion = apiVersion2 ?? config.apiVersion;
    this.client = createAdminRestApiClient({
      scheme: config.hostScheme,
      storeDomain: session.shop,
      apiVersion: apiVersion2 ?? config.apiVersion,
      accessToken: config.isCustomStoreApp
        ? customStoreAppAccessToken
        : session.accessToken,
      customFetchApi: abstractFetch,
      logger: clientLoggerFactory(config),
      userAgentPrefix: getUserAgent(config),
      defaultRetryTime: this.restClass().RETRY_WAIT_TIME,
      formatPaths: this.restClass().formatPaths,
      isTesting: config.isTesting,
    });
  }
  /**
   * Performs a GET request on the given path.
   */
  async get(params) {
    return this.request({ method: Method2.Get, ...params });
  }
  /**
   * Performs a POST request on the given path.
   */
  async post(params) {
    return this.request({ method: Method2.Post, ...params });
  }
  /**
   * Performs a PUT request on the given path.
   */
  async put(params) {
    return this.request({ method: Method2.Put, ...params });
  }
  /**
   * Performs a DELETE request on the given path.
   */
  async delete(params) {
    return this.request({ method: Method2.Delete, ...params });
  }
  async request(params) {
    const requestParams = {
      headers: {
        ...params.extraHeaders,
        ...(params.type ? { 'Content-Type': params.type.toString() } : {}),
      },
      retries: params.tries ? params.tries - 1 : void 0,
      searchParams: params.query,
    };
    let response;
    switch (params.method) {
      case Method2.Get:
        response = await this.client.get(params.path, requestParams);
        break;
      case Method2.Put:
        response = await this.client.put(params.path, {
          ...requestParams,
          data: params.data,
        });
        break;
      case Method2.Post:
        response = await this.client.post(params.path, {
          ...requestParams,
          data: params.data,
        });
        break;
      case Method2.Delete:
        response = await this.client.delete(params.path, requestParams);
        break;
      default:
        throw new InvalidRequestError(
          `Unsupported request method '${params.method}'`
        );
    }
    const bodyString = await response.text();
    const body =
      params.method === Method2.Delete && bodyString === ''
        ? {}
        : JSON.parse(bodyString);
    const responseHeaders = canonicalizeHeaders(
      Object.fromEntries(response.headers.entries())
    );
    if (!response.ok) {
      throwFailedRequest(body, (params.tries ?? 1) > 1, response);
    }
    const requestReturn = {
      body,
      headers: responseHeaders,
    };
    await this.logDeprecations(
      {
        method: params.method,
        url: params.path,
        headers: requestParams.headers,
        body: params.data ? JSON.stringify(params.data) : void 0,
      },
      requestReturn
    );
    const link = response.headers.get('Link');
    if (link !== void 0) {
      const pageInfo = {
        limit: params.query?.limit
          ? params.query?.limit.toString()
          : _RestClient.DEFAULT_LIMIT,
      };
      if (link) {
        const links = link.split(', ');
        for (const link2 of links) {
          const parsedLink = link2.match(_RestClient.LINK_HEADER_REGEXP);
          if (!parsedLink) {
            continue;
          }
          const linkRel = parsedLink[2];
          const linkUrl = new URL(parsedLink[1]);
          const linkFields = linkUrl.searchParams.get('fields');
          const linkPageToken = linkUrl.searchParams.get('page_info');
          if (!pageInfo.fields && linkFields) {
            pageInfo.fields = linkFields.split(',');
          }
          if (linkPageToken) {
            switch (linkRel) {
              case 'previous':
                pageInfo.previousPageUrl = parsedLink[1];
                pageInfo.prevPage = this.buildRequestParams(parsedLink[1]);
                break;
              case 'next':
                pageInfo.nextPageUrl = parsedLink[1];
                pageInfo.nextPage = this.buildRequestParams(parsedLink[1]);
                break;
            }
          }
        }
      }
      requestReturn.pageInfo = pageInfo;
    }
    return requestReturn;
  }
  restClass() {
    return this.constructor;
  }
  buildRequestParams(newPageUrl) {
    const pattern2 = `^/admin/api/[^/]+/(.*).json$`;
    const url = new URL(newPageUrl);
    const path2 = url.pathname.replace(new RegExp(pattern2), '$1');
    return {
      path: path2,
      query: Object.fromEntries(url.searchParams.entries()),
    };
  }
  async logDeprecations(request2, response) {
    const config = this.restClass().config;
    const deprecationReason = getHeader(
      response.headers,
      'X-Shopify-API-Deprecated-Reason'
    );
    if (deprecationReason) {
      const deprecation = {
        message: deprecationReason,
        path: request2.url,
      };
      if (request2.body) {
        deprecation.body = `${request2.body.substring(0, 100)}...`;
      }
      const depHash = await createSHA256HMAC(
        config.apiSecretKey,
        JSON.stringify(deprecation),
        HashFormat.Hex
      );
      if (
        !Object.keys(this.loggedDeprecations).includes(depHash) ||
        Date.now() - this.loggedDeprecations[depHash] >=
          _RestClient.DEPRECATION_ALERT_DELAY
      ) {
        this.loggedDeprecations[depHash] = Date.now();
        const stack = new Error().stack;
        const message2 = `API Deprecation Notice ${/* @__PURE__ */ new Date().toLocaleString()} : ${JSON.stringify(deprecation)}  -  Stack Trace: ${stack}`;
        await logger(config).warning(message2);
      }
    }
  }
};
var RestClient = _RestClient;
__publicField(RestClient, 'config');
__publicField(RestClient, 'formatPaths');
__publicField(RestClient, 'LINK_HEADER_REGEXP', /<([^<]+)>; rel="([^"]+)"/);
__publicField(RestClient, 'DEFAULT_LIMIT', '50');
__publicField(RestClient, 'RETRY_WAIT_TIME', 1e3);
__publicField(RestClient, 'DEPRECATION_ALERT_DELAY', 3e5);
function restClientClass(params) {
  const { config, formatPaths } = params;
  class NewRestClient extends RestClient {
    static config = config;
    static formatPaths = formatPaths === void 0 ? true : formatPaths;
  }
  Reflect.defineProperty(NewRestClient, 'name', {
    value: 'RestClient',
  });
  return NewRestClient;
}

// node_modules/@shopify/storefront-api-client/dist/constants.mjs
var DEFAULT_CONTENT_TYPE2 = 'application/json';
var DEFAULT_SDK_VARIANT2 = 'storefront-api-client';
var DEFAULT_CLIENT_VERSION3 = '1.0.9';
var PUBLIC_ACCESS_TOKEN_HEADER = 'X-Shopify-Storefront-Access-Token';
var PRIVATE_ACCESS_TOKEN_HEADER = 'Shopify-Storefront-Private-Token';
var SDK_VARIANT_HEADER2 = 'X-SDK-Variant';
var SDK_VERSION_HEADER2 = 'X-SDK-Version';
var SDK_VARIANT_SOURCE_HEADER = 'X-SDK-Variant-Source';
var CLIENT3 = 'Storefront API Client';

// node_modules/@shopify/storefront-api-client/dist/validations.mjs
function validatePrivateAccessTokenUsage(privateAccessToken) {
  if (privateAccessToken && typeof window !== 'undefined') {
    throw new Error(
      `${CLIENT3}: private access tokens and headers should only be used in a server-to-server implementation. Use the public API access token in nonserver environments.`
    );
  }
}
function validateRequiredAccessTokens(publicAccessToken, privateAccessToken) {
  if (!publicAccessToken && !privateAccessToken) {
    throw new Error(
      `${CLIENT3}: a public or private access token must be provided`
    );
  }
  if (publicAccessToken && privateAccessToken) {
    throw new Error(
      `${CLIENT3}: only provide either a public or private access token`
    );
  }
}

// node_modules/@shopify/storefront-api-client/dist/storefront-api-client.mjs
function createStorefrontApiClient({
  storeDomain,
  apiVersion: apiVersion2,
  publicAccessToken,
  privateAccessToken,
  clientName,
  retries = 0,
  customFetchApi,
  logger: logger2,
}) {
  const currentSupportedApiVersions = getCurrentSupportedApiVersions();
  const storeUrl = validateDomainAndGetStoreUrl({
    client: CLIENT3,
    storeDomain,
  });
  const baseApiVersionValidationParams = {
    client: CLIENT3,
    currentSupportedApiVersions,
    logger: logger2,
  };
  validateApiVersion({
    ...baseApiVersionValidationParams,
    apiVersion: apiVersion2,
  });
  validateRequiredAccessTokens(publicAccessToken, privateAccessToken);
  validatePrivateAccessTokenUsage(privateAccessToken);
  const apiUrlFormatter = generateApiUrlFormatter3(
    storeUrl,
    apiVersion2,
    baseApiVersionValidationParams
  );
  const config = {
    storeDomain: storeUrl,
    apiVersion: apiVersion2,
    ...(publicAccessToken
      ? { publicAccessToken }
      : {
          privateAccessToken,
        }),
    headers: {
      'Content-Type': DEFAULT_CONTENT_TYPE2,
      Accept: DEFAULT_CONTENT_TYPE2,
      [SDK_VARIANT_HEADER2]: DEFAULT_SDK_VARIANT2,
      [SDK_VERSION_HEADER2]: DEFAULT_CLIENT_VERSION3,
      ...(clientName ? { [SDK_VARIANT_SOURCE_HEADER]: clientName } : {}),
      ...(publicAccessToken
        ? { [PUBLIC_ACCESS_TOKEN_HEADER]: publicAccessToken }
        : { [PRIVATE_ACCESS_TOKEN_HEADER]: privateAccessToken }),
    },
    apiUrl: apiUrlFormatter(),
    clientName,
  };
  const graphqlClient = createGraphQLClient({
    headers: config.headers,
    url: config.apiUrl,
    retries,
    customFetchApi,
    logger: logger2,
  });
  const getHeaders2 = generateGetHeaders(config);
  const getApiUrl = generateGetApiUrl2(config, apiUrlFormatter);
  const getGQLClientParams = generateGetGQLClientParams({
    getHeaders: getHeaders2,
    getApiUrl,
  });
  const client = {
    config,
    getHeaders: getHeaders2,
    getApiUrl,
    fetch: (...props) => {
      return graphqlClient.fetch(...getGQLClientParams(...props));
    },
    request: (...props) => {
      return graphqlClient.request(...getGQLClientParams(...props));
    },
    requestStream: (...props) => {
      return graphqlClient.requestStream(...getGQLClientParams(...props));
    },
  };
  return Object.freeze(client);
}
function generateApiUrlFormatter3(
  storeUrl,
  defaultApiVersion,
  baseApiVersionValidationParams
) {
  return (apiVersion2) => {
    if (apiVersion2) {
      validateApiVersion({
        ...baseApiVersionValidationParams,
        apiVersion: apiVersion2,
      });
    }
    const urlApiVersion = (apiVersion2 ?? defaultApiVersion).trim();
    return `${storeUrl}/api/${urlApiVersion}/graphql.json`;
  };
}
function generateGetApiUrl2(config, apiUrlFormatter) {
  return (propApiVersion) => {
    return propApiVersion ? apiUrlFormatter(propApiVersion) : config.apiUrl;
  };
}

// node_modules/@shopify/shopify-api/dist/esm/lib/clients/storefront/client.mjs
var StorefrontClient = class {
  session;
  client;
  apiVersion;
  constructor(params) {
    const config = this.storefrontClass().config;
    if (!config.isCustomStoreApp && !params.session.accessToken) {
      throw new MissingRequiredArgument(
        'Missing access token when creating GraphQL client'
      );
    }
    if (params.apiVersion) {
      const message2 =
        params.apiVersion === config.apiVersion
          ? `Storefront client has a redundant API version override to the default ${params.apiVersion}`
          : `Storefront client overriding default API version ${config.apiVersion} with ${params.apiVersion}`;
      logger(config).debug(message2);
    }
    let accessToken;
    if (config.isCustomStoreApp) {
      accessToken = config.privateAppStorefrontAccessToken;
      if (!accessToken) {
        throw new MissingRequiredArgument(
          'Custom store apps must set the privateAppStorefrontAccessToken property to call the Storefront API.'
        );
      }
    } else {
      accessToken = params.session.accessToken;
      if (!accessToken) {
        throw new MissingRequiredArgument('Session missing access token.');
      }
    }
    this.session = params.session;
    this.apiVersion = params.apiVersion;
    this.client = createStorefrontApiClient({
      privateAccessToken: accessToken,
      apiVersion: this.apiVersion ?? config.apiVersion,
      storeDomain: this.session.shop,
      customFetchApi: abstractFetch,
      logger: clientLoggerFactory(config),
      clientName: getUserAgent(config),
    });
  }
  async query(params) {
    logger(this.storefrontClass().config).deprecated(
      '12.0.0',
      'The query method is deprecated, and was replaced with the request method.\nSee the migration guide: https://github.com/Shopify/shopify-app-js/blob/main/packages/apps/shopify-api/docs/migrating-to-v9.md#using-the-new-clients.'
    );
    if (
      (typeof params.data === 'string' && params.data.length === 0) ||
      Object.entries(params.data).length === 0
    ) {
      throw new MissingRequiredArgument('Query missing.');
    }
    let operation;
    let variables;
    if (typeof params.data === 'string') {
      operation = params.data;
    } else {
      operation = params.data.query;
      variables = params.data.variables;
    }
    const headers = Object.fromEntries(
      Object.entries(params?.extraHeaders ?? {}).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(', ') : value.toString(),
      ])
    );
    const response = await this.request(operation, {
      headers,
      retries: params.tries ? params.tries - 1 : void 0,
      variables,
    });
    return { body: response, headers: {} };
  }
  async request(operation, options) {
    const response = await this.client.request(operation, {
      apiVersion: this.apiVersion || this.storefrontClass().config.apiVersion,
      ...options,
    });
    if (response.errors) {
      const fetchResponse = response.errors.response;
      throwFailedRequest(response, (options?.retries ?? 0) > 0, fetchResponse);
    }
    return response;
  }
  storefrontClass() {
    return this.constructor;
  }
};
__publicField(StorefrontClient, 'config');
function storefrontClientClass(params) {
  const { config } = params;
  class NewStorefrontClient extends StorefrontClient {
    static config = config;
  }
  Reflect.defineProperty(NewStorefrontClient, 'name', {
    value: 'StorefrontClient',
  });
  return NewStorefrontClient;
}

// node_modules/@shopify/shopify-api/dist/esm/lib/clients/graphql_proxy/graphql_proxy.mjs
function graphqlProxy(config) {
  return async ({ session, rawBody }) => {
    if (!session.accessToken) {
      throw new InvalidSession(
        'Cannot proxy query. Session not authenticated.'
      );
    }
    const GraphqlClient2 = graphqlClientClass({ config });
    const client = new GraphqlClient2({ session });
    let query;
    let variables;
    if (typeof rawBody === 'string') {
      query = rawBody;
    } else {
      query = rawBody.query;
      variables = rawBody.variables;
    }
    if (!query) {
      throw new MissingRequiredArgument('Query missing.');
    }
    const response = await client.request(query, { variables });
    return { body: response, headers: {} };
  };
}

// node_modules/@shopify/shopify-api/dist/esm/lib/clients/index.mjs
function clientClasses(config) {
  return {
    // We don't pass in the HttpClient because the RestClient inherits from it, and goes through the same setup process
    Rest: restClientClass({ config }),
    Graphql: graphqlClientClass({ config }),
    Storefront: storefrontClientClass({ config }),
    graphqlProxy: graphqlProxy(config),
  };
}

// node_modules/@shopify/shopify-api/dist/esm/lib/utils/processed-query.mjs
var ProcessedQuery = class {
  static stringify(keyValuePairs) {
    if (!keyValuePairs || Object.keys(keyValuePairs).length === 0) return '';
    return new ProcessedQuery().putAll(keyValuePairs).stringify();
  }
  processedQuery;
  constructor() {
    this.processedQuery = new URLSearchParams();
  }
  putAll(keyValuePairs) {
    Object.entries(keyValuePairs).forEach(([key, value]) =>
      this.put(key, value)
    );
    return this;
  }
  put(key, value) {
    if (Array.isArray(value)) {
      this.putArray(key, value);
    } else if (value?.constructor === Object) {
      this.putObject(key, value);
    } else {
      this.putSimple(key, value);
    }
  }
  putArray(key, value) {
    value.forEach((arrayValue) =>
      this.processedQuery.append(`${key}[]`, `${arrayValue}`)
    );
  }
  putObject(key, value) {
    Object.entries(value).forEach(([entry, entryValue]) => {
      this.processedQuery.append(`${key}[${entry}]`, `${entryValue}`);
    });
  }
  putSimple(key, value) {
    this.processedQuery.append(key, `${value}`);
  }
  stringify(omitQuestionMark = false) {
    const queryString = this.processedQuery.toString();
    return omitQuestionMark ? queryString : `?${queryString}`;
  }
};

// node_modules/@shopify/shopify-api/dist/esm/lib/auth/oauth/safe-compare.mjs
var safeCompare = (strA, strB) => {
  if (typeof strA === typeof strB) {
    const enc = new TextEncoder();
    const buffA = enc.encode(JSON.stringify(strA));
    const buffB = enc.encode(JSON.stringify(strB));
    if (buffA.length === buffB.length) {
      return timingSafeEqual(buffA, buffB);
    }
  } else {
    throw new SafeCompareError(
      `Mismatched data types provided: ${typeof strA} and ${typeof strB}`
    );
  }
  return false;
};
function timingSafeEqual(bufA, bufB) {
  const viewA = new Uint8Array(bufA);
  const viewB = new Uint8Array(bufB);
  let out = 0;
  for (let i = 0; i < viewA.length; i++) {
    out |= viewA[i] ^ viewB[i];
  }
  return out === 0;
}

// node_modules/@shopify/shopify-api/dist/esm/lib/utils/types.mjs
var HmacValidationType;
(function (HmacValidationType2) {
  HmacValidationType2['Flow'] = 'flow';
  HmacValidationType2['Webhook'] = 'webhook';
  HmacValidationType2['FulfillmentService'] = 'fulfillment_service';
})(HmacValidationType || (HmacValidationType = {}));
var ValidationErrorReason = {
  MissingBody: 'missing_body',
  InvalidHmac: 'invalid_hmac',
  MissingHmac: 'missing_hmac',
};

// node_modules/@shopify/shopify-api/dist/esm/lib/utils/hmac-validator.mjs
var HMAC_TIMESTAMP_PERMITTED_CLOCK_TOLERANCE_SEC = 90;
function stringifyQueryForAdmin(query) {
  const processedQuery = new ProcessedQuery();
  Object.keys(query)
    .sort((val1, val2) => val1.localeCompare(val2))
    .forEach((key) => processedQuery.put(key, query[key]));
  return processedQuery.stringify(true);
}
function stringifyQueryForAppProxy(query) {
  return Object.entries(query)
    .sort(([val1], [val2]) => val1.localeCompare(val2))
    .reduce((acc, [key, value]) => {
      return `${acc}${key}=${Array.isArray(value) ? value.join(',') : value}`;
    }, '');
}
function generateLocalHmac(config) {
  return async (params, signator = 'admin') => {
    const { hmac, signature, ...query } = params;
    const queryString =
      signator === 'admin'
        ? stringifyQueryForAdmin(query)
        : stringifyQueryForAppProxy(query);
    return createSHA256HMAC(config.apiSecretKey, queryString, HashFormat.Hex);
  };
}
function validateHmac(config) {
  return async (query, { signator } = { signator: 'admin' }) => {
    if (signator === 'admin' && !query.hmac) {
      throw new InvalidHmacError('Query does not contain an HMAC value.');
    }
    if (signator === 'appProxy' && !query.signature) {
      throw new InvalidHmacError('Query does not contain a signature value.');
    }
    validateHmacTimestamp(query);
    const hmac = signator === 'appProxy' ? query.signature : query.hmac;
    const localHmac = await generateLocalHmac(config)(query, signator);
    return safeCompare(hmac, localHmac);
  };
}
async function validateHmacString(config, data, hmac, format) {
  const localHmac = await createSHA256HMAC(config.apiSecretKey, data, format);
  return safeCompare(hmac, localHmac);
}
function getCurrentTimeInSec() {
  return Math.trunc(Date.now() / 1e3);
}
function validateHmacFromRequestFactory(config) {
  return async function validateHmacFromRequest({
    type,
    rawBody,
    ...adapterArgs
  }) {
    const request2 = await abstractConvertRequest(adapterArgs);
    if (!rawBody.length) {
      return fail(ValidationErrorReason.MissingBody, type, config);
    }
    const hmac = getHeader(request2.headers, ShopifyHeader.Hmac);
    if (!hmac) {
      return fail(ValidationErrorReason.MissingHmac, type, config);
    }
    const validHmac = await validateHmacString(
      config,
      rawBody,
      hmac,
      HashFormat.Base64
    );
    if (!validHmac) {
      return fail(ValidationErrorReason.InvalidHmac, type, config);
    }
    return succeed(type, config);
  };
}
function validateHmacTimestamp(query) {
  if (
    Math.abs(getCurrentTimeInSec() - Number(query.timestamp)) >
    HMAC_TIMESTAMP_PERMITTED_CLOCK_TOLERANCE_SEC
  ) {
    throw new InvalidHmacError(
      'HMAC timestamp is outside of the tolerance range'
    );
  }
}
async function fail(reason, type, config) {
  const log2 = logger(config);
  await log2.debug(`${type} request is not valid`, { reason });
  return {
    valid: false,
    reason,
  };
}
async function succeed(type, config) {
  const log2 = logger(config);
  await log2.debug(`${type} request is valid`);
  return {
    valid: true,
  };
}

// node_modules/@shopify/shopify-api/dist/esm/lib/auth/decode-host.mjs
function decodeHost(host) {
  return atob(host);
}

// node_modules/@shopify/shopify-api/dist/esm/lib/utils/shop-admin-url-helper.mjs
function shopAdminUrlToLegacyUrl(shopAdminUrl) {
  const shopUrl = removeProtocol(shopAdminUrl);
  const isShopAdminUrl = shopUrl.split('.')[0] === 'admin';
  if (!isShopAdminUrl) {
    return null;
  }
  const regex = new RegExp(`admin\\..+/store/([^/]+)`);
  const matches = shopUrl.match(regex);
  if (matches && matches.length === 2) {
    const shopName = matches[1];
    const isSpinUrl = shopUrl.includes('spin.dev/store/');
    const isLocalUrl = shopUrl.includes('shop.dev/store/');
    if (isSpinUrl) {
      return spinAdminUrlToLegacyUrl(shopUrl);
    } else if (isLocalUrl) {
      return localAdminUrlToLegacyUrl(shopUrl);
    } else {
      return `${shopName}.myshopify.com`;
    }
  } else {
    return null;
  }
}
function legacyUrlToShopAdminUrl(legacyAdminUrl) {
  const shopUrl = removeProtocol(legacyAdminUrl);
  const regex = new RegExp(`(.+)\\.myshopify\\.com$`);
  const matches = shopUrl.match(regex);
  if (matches && matches.length === 2) {
    const shopName = matches[1];
    return `admin.shopify.com/store/${shopName}`;
  } else {
    const isSpinUrl = shopUrl.endsWith('spin.dev');
    const isLocalUrl = shopUrl.endsWith('shop.dev');
    if (isSpinUrl) {
      return spinLegacyUrlToAdminUrl(shopUrl);
    } else if (isLocalUrl) {
      return localLegacyUrlToAdminUrl(shopUrl);
    } else {
      return null;
    }
  }
}
function spinAdminUrlToLegacyUrl(shopAdminUrl) {
  const spinRegex = new RegExp(`admin\\.web\\.(.+\\.spin\\.dev)/store/(.+)`);
  const spinMatches = shopAdminUrl.match(spinRegex);
  if (spinMatches && spinMatches.length === 3) {
    const spinUrl = spinMatches[1];
    const shopName = spinMatches[2];
    return `${shopName}.shopify.${spinUrl}`;
  } else {
    return null;
  }
}
function localAdminUrlToLegacyUrl(shopAdminUrl) {
  const localRegex = new RegExp(`admin\\.shop\\.dev/store/(.+)`);
  const localMatches = shopAdminUrl.match(localRegex);
  if (localMatches && localMatches.length === 2) {
    const shopName = localMatches[1];
    return `${shopName}.shop.dev`;
  } else {
    return null;
  }
}
function spinLegacyUrlToAdminUrl(legacyAdminUrl) {
  const spinRegex = new RegExp(`(.+)\\.shopify\\.(.+\\.spin\\.dev)`);
  const spinMatches = legacyAdminUrl.match(spinRegex);
  if (spinMatches && spinMatches.length === 3) {
    const shopName = spinMatches[1];
    const spinUrl = spinMatches[2];
    return `admin.web.${spinUrl}/store/${shopName}`;
  } else {
    return null;
  }
}
function localLegacyUrlToAdminUrl(legacyAdminUrl) {
  const localRegex = new RegExp(`(.+)\\.shop\\.dev$`);
  const localMatches = legacyAdminUrl.match(localRegex);
  if (localMatches && localMatches.length === 2) {
    const shopName = localMatches[1];
    return `admin.shop.dev/store/${shopName}`;
  } else {
    return null;
  }
}
function removeProtocol(url) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

// node_modules/@shopify/shopify-api/dist/esm/lib/utils/shop-validator.mjs
function sanitizeShop(config) {
  return (shop, throwOnInvalid = false) => {
    let shopUrl = shop;
    const domainsRegex = [
      'myshopify\\.com',
      'shopify\\.com',
      'myshopify\\.io',
      'shop\\.dev',
    ];
    if (config.customShopDomains) {
      domainsRegex.push(
        ...config.customShopDomains.map((regex) =>
          typeof regex === 'string' ? regex : regex.source
        )
      );
    }
    const shopUrlRegex = new RegExp(
      `^[a-zA-Z0-9][a-zA-Z0-9-_]*\\.(${domainsRegex.join('|')})[/]*$`
    );
    const shopAdminRegex = new RegExp(
      `^admin\\.(${domainsRegex.join('|')})/store/([a-zA-Z0-9][a-zA-Z0-9-_]*)$`
    );
    const isShopAdminUrl = shopAdminRegex.test(shopUrl);
    if (isShopAdminUrl) {
      shopUrl = shopAdminUrlToLegacyUrl(shopUrl) || '';
    }
    const sanitizedShop = shopUrlRegex.test(shopUrl) ? shopUrl : null;
    if (!sanitizedShop && throwOnInvalid) {
      throw new InvalidShopError('Received invalid shop argument');
    }
    return sanitizedShop;
  };
}
function sanitizeHost() {
  return (host, throwOnInvalid = false) => {
    const base64regex = /^[0-9a-zA-Z+/]+={0,2}$/;
    let sanitizedHost = base64regex.test(host) ? host : null;
    if (sanitizedHost) {
      const { hostname } = new URL(`https://${decodeHost(sanitizedHost)}`);
      const originsRegex = [
        'myshopify\\.com',
        'shopify\\.com',
        'myshopify\\.io',
        'spin\\.dev',
        'shop\\.dev',
      ];
      const hostRegex = new RegExp(`\\.(${originsRegex.join('|')})$`);
      if (!hostRegex.test(hostname)) {
        sanitizedHost = null;
      }
    }
    if (!sanitizedHost && throwOnInvalid) {
      throw new InvalidHostError('Received invalid host argument');
    }
    return sanitizedHost;
  };
}

// node_modules/@shopify/shopify-api/dist/esm/lib/clients/types.mjs
var DataType;
(function (DataType2) {
  DataType2['JSON'] = 'application/json';
  DataType2['GraphQL'] = 'application/graphql';
  DataType2['URLEncoded'] = 'application/x-www-form-urlencoded';
})(DataType || (DataType = {}));

// node_modules/@shopify/shopify-api/dist/esm/lib/utils/fetch-request.mjs
function fetchRequestFactory(config) {
  return async function fetchRequest(url, options) {
    const log2 = logger(config);
    const doLog =
      config.logger.httpRequests && config.logger.level === LogSeverity.Debug;
    if (doLog) {
      log2.debug('Making HTTP request', {
        method: options?.method || 'GET',
        url,
        ...(options?.body && { body: options?.body }),
      });
    }
    const response = await abstractFetch(url, options);
    if (doLog) {
      log2.debug('HTTP request completed', {
        method: options?.method || 'GET',
        url,
        status: response.status,
      });
    }
    return response;
  };
}

// node_modules/@shopify/shopify-api/dist/esm/lib/auth/oauth/types.mjs
var SESSION_COOKIE_NAME = 'shopify_app_session';
var STATE_COOKIE_NAME = 'shopify_app_state';

// node_modules/@shopify/shopify-api/dist/esm/lib/auth/oauth/nonce.mjs
function nonce() {
  const length = 15;
  const bytes = cryptoVar.getRandomValues(new Uint8Array(length));
  const nonce2 = bytes
    .map((byte) => {
      return byte % 10;
    })
    .join('');
  return nonce2;
}

// node_modules/@shopify/shopify-api/dist/esm/lib/auth/oauth/create-session.mjs
import { v4 } from 'uuid';

// node_modules/@shopify/shopify-api/dist/esm/lib/session/session.mjs
var propertiesToSave = [
  'id',
  'shop',
  'state',
  'isOnline',
  'scope',
  'accessToken',
  'expires',
  'onlineAccessInfo',
];
var Session = class {
  static fromPropertyArray(entries, returnUserData = false) {
    if (!Array.isArray(entries)) {
      throw new InvalidSession(
        'The parameter is not an array: a Session cannot be created from this object.'
      );
    }
    const obj = Object.fromEntries(
      entries
        .filter(([_key, value]) => value !== null && value !== void 0)
        .map(([key, value]) => {
          switch (key.toLowerCase()) {
            case 'isonline':
              return ['isOnline', value];
            case 'accesstoken':
              return ['accessToken', value];
            case 'onlineaccessinfo':
              return ['onlineAccessInfo', value];
            case 'userid':
              return ['userId', value];
            case 'firstname':
              return ['firstName', value];
            case 'lastname':
              return ['lastName', value];
            case 'accountowner':
              return ['accountOwner', value];
            case 'emailverified':
              return ['emailVerified', value];
            default:
              return [key.toLowerCase(), value];
          }
        })
    );
    const sessionData = {};
    const onlineAccessInfo = {
      associated_user: {},
    };
    Object.entries(obj).forEach(([key, value]) => {
      switch (key) {
        case 'isOnline':
          if (typeof value === 'string') {
            sessionData[key] = value.toString().toLowerCase() === 'true';
          } else if (typeof value === 'number') {
            sessionData[key] = Boolean(value);
          } else {
            sessionData[key] = value;
          }
          break;
        case 'scope':
          sessionData[key] = value.toString();
          break;
        case 'expires':
          sessionData[key] = value ? new Date(Number(value)) : void 0;
          break;
        case 'onlineAccessInfo':
          onlineAccessInfo.associated_user.id = Number(value);
          break;
        case 'userId':
          if (returnUserData) {
            onlineAccessInfo.associated_user.id = Number(value);
            break;
          }
        case 'firstName':
          if (returnUserData) {
            onlineAccessInfo.associated_user.first_name = String(value);
            break;
          }
        case 'lastName':
          if (returnUserData) {
            onlineAccessInfo.associated_user.last_name = String(value);
            break;
          }
        case 'email':
          if (returnUserData) {
            onlineAccessInfo.associated_user.email = String(value);
            break;
          }
        case 'accountOwner':
          if (returnUserData) {
            onlineAccessInfo.associated_user.account_owner = Boolean(value);
            break;
          }
        case 'locale':
          if (returnUserData) {
            onlineAccessInfo.associated_user.locale = String(value);
            break;
          }
        case 'collaborator':
          if (returnUserData) {
            onlineAccessInfo.associated_user.collaborator = Boolean(value);
            break;
          }
        case 'emailVerified':
          if (returnUserData) {
            onlineAccessInfo.associated_user.email_verified = Boolean(value);
            break;
          }
        default:
          sessionData[key] = value;
      }
    });
    if (sessionData.isOnline) {
      sessionData.onlineAccessInfo = onlineAccessInfo;
    }
    const session = new Session(sessionData);
    return session;
  }
  /**
   * The unique identifier for the session.
   */
  id;
  /**
   * The Shopify shop domain, such as `example.myshopify.com`.
   */
  shop;
  /**
   * The state of the session. Used for the OAuth authentication code flow.
   */
  state;
  /**
   * Whether the access token in the session is online or offline.
   */
  isOnline;
  /**
   * The desired scopes for the access token, at the time the session was created.
   */
  scope;
  /**
   * The date the access token expires.
   */
  expires;
  /**
   * The access token for the session.
   */
  accessToken;
  /**
   * Information on the user for the session. Only present for online sessions.
   */
  onlineAccessInfo;
  constructor(params) {
    Object.assign(this, params);
  }
  /**
   * Whether the session is active. Active sessions have an access token that is not expired, and has has the given
   * scopes if scopes is equal to a truthy value.
   */
  isActive(scopes, withinMillisecondsOfExpiry = 500) {
    const hasAccessToken = Boolean(this.accessToken);
    const isTokenNotExpired = !this.isExpired(withinMillisecondsOfExpiry);
    const isScopeChanged = this.isScopeChanged(scopes);
    return !isScopeChanged && hasAccessToken && isTokenNotExpired;
  }
  /**
   * Whether the access token includes the given scopes if they are provided.
   */
  isScopeChanged(scopes) {
    if (typeof scopes === 'undefined') {
      return false;
    }
    return !this.isScopeIncluded(scopes);
  }
  /**
   * Whether the access token includes the given scopes.
   */
  isScopeIncluded(scopes) {
    const requiredScopes =
      scopes instanceof AuthScopes ? scopes : new AuthScopes(scopes);
    const sessionScopes = new AuthScopes(this.scope);
    return sessionScopes.has(requiredScopes);
  }
  /**
   * Whether the access token is expired.
   */
  isExpired(withinMillisecondsOfExpiry = 0) {
    return Boolean(
      this.expires &&
      this.expires.getTime() - withinMillisecondsOfExpiry < Date.now()
    );
  }
  /**
   * Converts an object with data into a Session.
   */
  toObject() {
    const object = {
      id: this.id,
      shop: this.shop,
      state: this.state,
      isOnline: this.isOnline,
    };
    if (this.scope) {
      object.scope = this.scope;
    }
    if (this.expires) {
      object.expires = this.expires;
    }
    if (this.accessToken) {
      object.accessToken = this.accessToken;
    }
    if (this.onlineAccessInfo) {
      object.onlineAccessInfo = this.onlineAccessInfo;
    }
    return object;
  }
  /**
   * Checks whether the given session is equal to this session.
   */
  equals(other) {
    if (!other) return false;
    const mandatoryPropsMatch =
      this.id === other.id &&
      this.shop === other.shop &&
      this.state === other.state &&
      this.isOnline === other.isOnline;
    if (!mandatoryPropsMatch) return false;
    const copyA = this.toPropertyArray(true);
    copyA.sort(([k1], [k2]) => (k1 < k2 ? -1 : 1));
    const copyB = other.toPropertyArray(true);
    copyB.sort(([k1], [k2]) => (k1 < k2 ? -1 : 1));
    return JSON.stringify(copyA) === JSON.stringify(copyB);
  }
  /**
   * Converts the session into an array of key-value pairs.
   */
  toPropertyArray(returnUserData = false) {
    return Object.entries(this)
      .filter(
        ([key, value]) =>
          propertiesToSave.includes(key) && value !== void 0 && value !== null
      )
      .flatMap(([key, value]) => {
        switch (key) {
          case 'expires':
            return [[key, value ? value.getTime() : void 0]];
          case 'onlineAccessInfo':
            if (!returnUserData) {
              return [[key, value.associated_user.id]];
            } else {
              return [
                ['userId', value?.associated_user?.id],
                ['firstName', value?.associated_user?.first_name],
                ['lastName', value?.associated_user?.last_name],
                ['email', value?.associated_user?.email],
                ['locale', value?.associated_user?.locale],
                ['emailVerified', value?.associated_user?.email_verified],
                ['accountOwner', value?.associated_user?.account_owner],
                ['collaborator', value?.associated_user?.collaborator],
              ];
            }
          default:
            return [[key, value]];
        }
      })
      .filter(([_key, value]) => value !== void 0);
  }
};

// node_modules/jose/dist/node/esm/runtime/base64url.js
import { Buffer as Buffer2 } from 'node:buffer';

// node_modules/jose/dist/node/esm/lib/buffer_utils.js
var encoder = new TextEncoder();
var decoder = new TextDecoder();
var MAX_INT32 = 2 ** 32;
function concat(...buffers) {
  const size = buffers.reduce((acc, { length }) => acc + length, 0);
  const buf = new Uint8Array(size);
  let i = 0;
  for (const buffer of buffers) {
    buf.set(buffer, i);
    i += buffer.length;
  }
  return buf;
}

// node_modules/jose/dist/node/esm/runtime/base64url.js
function normalize(input) {
  let encoded = input;
  if (encoded instanceof Uint8Array) {
    encoded = decoder.decode(encoded);
  }
  return encoded;
}
var decode = (input) =>
  new Uint8Array(Buffer2.from(normalize(input), 'base64url'));

// node_modules/jose/dist/node/esm/util/errors.js
var JOSEError = class extends Error {
  code = 'ERR_JOSE_GENERIC';
  constructor(message2, options) {
    super(message2, options);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
};
__publicField(JOSEError, 'code', 'ERR_JOSE_GENERIC');
var JWTClaimValidationFailed = class extends JOSEError {
  code = 'ERR_JWT_CLAIM_VALIDATION_FAILED';
  claim;
  reason;
  payload;
  constructor(
    message2,
    payload,
    claim = 'unspecified',
    reason = 'unspecified'
  ) {
    super(message2, { cause: { claim, reason, payload } });
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
};
__publicField(
  JWTClaimValidationFailed,
  'code',
  'ERR_JWT_CLAIM_VALIDATION_FAILED'
);
var JWTExpired = class extends JOSEError {
  code = 'ERR_JWT_EXPIRED';
  claim;
  reason;
  payload;
  constructor(
    message2,
    payload,
    claim = 'unspecified',
    reason = 'unspecified'
  ) {
    super(message2, { cause: { claim, reason, payload } });
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
};
__publicField(JWTExpired, 'code', 'ERR_JWT_EXPIRED');
var JOSEAlgNotAllowed = class extends JOSEError {
  code = 'ERR_JOSE_ALG_NOT_ALLOWED';
};
__publicField(JOSEAlgNotAllowed, 'code', 'ERR_JOSE_ALG_NOT_ALLOWED');
var JOSENotSupported = class extends JOSEError {
  code = 'ERR_JOSE_NOT_SUPPORTED';
};
__publicField(JOSENotSupported, 'code', 'ERR_JOSE_NOT_SUPPORTED');
var JWSInvalid = class extends JOSEError {
  code = 'ERR_JWS_INVALID';
};
__publicField(JWSInvalid, 'code', 'ERR_JWS_INVALID');
var JWTInvalid = class extends JOSEError {
  code = 'ERR_JWT_INVALID';
};
__publicField(JWTInvalid, 'code', 'ERR_JWT_INVALID');
var JWKSMultipleMatchingKeys = class extends JOSEError {
  [Symbol.asyncIterator];
  code = 'ERR_JWKS_MULTIPLE_MATCHING_KEYS';
  constructor(
    message2 = 'multiple matching keys found in the JSON Web Key Set',
    options
  ) {
    super(message2, options);
  }
};
__publicField(
  JWKSMultipleMatchingKeys,
  'code',
  'ERR_JWKS_MULTIPLE_MATCHING_KEYS'
);
var JWSSignatureVerificationFailed = class extends JOSEError {
  code = 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED';
  constructor(message2 = 'signature verification failed', options) {
    super(message2, options);
  }
};
__publicField(
  JWSSignatureVerificationFailed,
  'code',
  'ERR_JWS_SIGNATURE_VERIFICATION_FAILED'
);

// node_modules/jose/dist/node/esm/runtime/is_key_object.js
import * as util from 'node:util';
var is_key_object_default = (obj) => util.types.isKeyObject(obj);

// node_modules/jose/dist/node/esm/runtime/webcrypto.js
import * as crypto3 from 'node:crypto';
import * as util2 from 'node:util';
var webcrypto2 = crypto3.webcrypto;
var webcrypto_default = webcrypto2;
var isCryptoKey = (key) => util2.types.isCryptoKey(key);

// node_modules/jose/dist/node/esm/lib/crypto_key.js
function unusable(name, prop = 'algorithm.name') {
  return new TypeError(
    `CryptoKey does not support this operation, its ${prop} must be ${name}`
  );
}
function isAlgorithm(algorithm, name) {
  return algorithm.name === name;
}
function getHashLength(hash) {
  return parseInt(hash.name.slice(4), 10);
}
function getNamedCurve(alg) {
  switch (alg) {
    case 'ES256':
      return 'P-256';
    case 'ES384':
      return 'P-384';
    case 'ES512':
      return 'P-521';
    default:
      throw new Error('unreachable');
  }
}
function checkUsage(key, usages) {
  if (
    usages.length &&
    !usages.some((expected) => key.usages.includes(expected))
  ) {
    let msg =
      'CryptoKey does not support this operation, its usages must include ';
    if (usages.length > 2) {
      const last = usages.pop();
      msg += `one of ${usages.join(', ')}, or ${last}.`;
    } else if (usages.length === 2) {
      msg += `one of ${usages[0]} or ${usages[1]}.`;
    } else {
      msg += `${usages[0]}.`;
    }
    throw new TypeError(msg);
  }
}
function checkSigCryptoKey(key, alg, ...usages) {
  switch (alg) {
    case 'HS256':
    case 'HS384':
    case 'HS512': {
      if (!isAlgorithm(key.algorithm, 'HMAC')) throw unusable('HMAC');
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, 'algorithm.hash');
      break;
    }
    case 'RS256':
    case 'RS384':
    case 'RS512': {
      if (!isAlgorithm(key.algorithm, 'RSASSA-PKCS1-v1_5'))
        throw unusable('RSASSA-PKCS1-v1_5');
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, 'algorithm.hash');
      break;
    }
    case 'PS256':
    case 'PS384':
    case 'PS512': {
      if (!isAlgorithm(key.algorithm, 'RSA-PSS')) throw unusable('RSA-PSS');
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, 'algorithm.hash');
      break;
    }
    case 'EdDSA': {
      if (key.algorithm.name !== 'Ed25519' && key.algorithm.name !== 'Ed448') {
        throw unusable('Ed25519 or Ed448');
      }
      break;
    }
    case 'Ed25519': {
      if (!isAlgorithm(key.algorithm, 'Ed25519')) throw unusable('Ed25519');
      break;
    }
    case 'ES256':
    case 'ES384':
    case 'ES512': {
      if (!isAlgorithm(key.algorithm, 'ECDSA')) throw unusable('ECDSA');
      const expected = getNamedCurve(alg);
      const actual = key.algorithm.namedCurve;
      if (actual !== expected) throw unusable(expected, 'algorithm.namedCurve');
      break;
    }
    default:
      throw new TypeError('CryptoKey does not support this operation');
  }
  checkUsage(key, usages);
}

// node_modules/jose/dist/node/esm/lib/invalid_key_input.js
function message(msg, actual, ...types4) {
  types4 = types4.filter(Boolean);
  if (types4.length > 2) {
    const last = types4.pop();
    msg += `one of type ${types4.join(', ')}, or ${last}.`;
  } else if (types4.length === 2) {
    msg += `one of type ${types4[0]} or ${types4[1]}.`;
  } else {
    msg += `of type ${types4[0]}.`;
  }
  if (actual == null) {
    msg += ` Received ${actual}`;
  } else if (typeof actual === 'function' && actual.name) {
    msg += ` Received function ${actual.name}`;
  } else if (typeof actual === 'object' && actual != null) {
    if (actual.constructor?.name) {
      msg += ` Received an instance of ${actual.constructor.name}`;
    }
  }
  return msg;
}
var invalid_key_input_default = (actual, ...types4) => {
  return message('Key must be ', actual, ...types4);
};
function withAlg(alg, actual, ...types4) {
  return message(`Key for the ${alg} algorithm must be `, actual, ...types4);
}

// node_modules/jose/dist/node/esm/runtime/is_key_like.js
var is_key_like_default = (key) =>
  is_key_object_default(key) || isCryptoKey(key);
var types3 = ['KeyObject'];
if (globalThis.CryptoKey || webcrypto_default?.CryptoKey) {
  types3.push('CryptoKey');
}

// node_modules/jose/dist/node/esm/lib/is_disjoint.js
var isDisjoint = (...headers) => {
  const sources = headers.filter(Boolean);
  if (sources.length === 0 || sources.length === 1) {
    return true;
  }
  let acc;
  for (const header of sources) {
    const parameters = Object.keys(header);
    if (!acc || acc.size === 0) {
      acc = new Set(parameters);
      continue;
    }
    for (const parameter of parameters) {
      if (acc.has(parameter)) {
        return false;
      }
      acc.add(parameter);
    }
  }
  return true;
};
var is_disjoint_default = isDisjoint;

// node_modules/jose/dist/node/esm/lib/is_object.js
function isObjectLike(value) {
  return typeof value === 'object' && value !== null;
}
function isObject(input) {
  if (
    !isObjectLike(input) ||
    Object.prototype.toString.call(input) !== '[object Object]'
  ) {
    return false;
  }
  if (Object.getPrototypeOf(input) === null) {
    return true;
  }
  let proto = input;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }
  return Object.getPrototypeOf(input) === proto;
}

// node_modules/jose/dist/node/esm/runtime/get_named_curve.js
import { KeyObject } from 'node:crypto';

// node_modules/jose/dist/node/esm/lib/is_jwk.js
function isJWK(key) {
  return isObject(key) && typeof key.kty === 'string';
}
function isPrivateJWK(key) {
  return key.kty !== 'oct' && typeof key.d === 'string';
}
function isPublicJWK(key) {
  return key.kty !== 'oct' && typeof key.d === 'undefined';
}
function isSecretJWK(key) {
  return isJWK(key) && key.kty === 'oct' && typeof key.k === 'string';
}

// node_modules/jose/dist/node/esm/runtime/get_named_curve.js
var namedCurveToJOSE = (namedCurve) => {
  switch (namedCurve) {
    case 'prime256v1':
      return 'P-256';
    case 'secp384r1':
      return 'P-384';
    case 'secp521r1':
      return 'P-521';
    case 'secp256k1':
      return 'secp256k1';
    default:
      throw new JOSENotSupported('Unsupported key curve for this operation');
  }
};
var getNamedCurve2 = (kee, raw) => {
  let key;
  if (isCryptoKey(kee)) {
    key = KeyObject.from(kee);
  } else if (is_key_object_default(kee)) {
    key = kee;
  } else if (isJWK(kee)) {
    return kee.crv;
  } else {
    throw new TypeError(invalid_key_input_default(kee, ...types3));
  }
  if (key.type === 'secret') {
    throw new TypeError(
      'only "private" or "public" type keys can be used for this operation'
    );
  }
  switch (key.asymmetricKeyType) {
    case 'ed25519':
    case 'ed448':
      return `Ed${key.asymmetricKeyType.slice(2)}`;
    case 'x25519':
    case 'x448':
      return `X${key.asymmetricKeyType.slice(1)}`;
    case 'ec': {
      const namedCurve = key.asymmetricKeyDetails.namedCurve;
      if (raw) {
        return namedCurve;
      }
      return namedCurveToJOSE(namedCurve);
    }
    default:
      throw new TypeError('Invalid asymmetric key type for this operation');
  }
};
var get_named_curve_default = getNamedCurve2;

// node_modules/jose/dist/node/esm/runtime/check_key_length.js
import { KeyObject as KeyObject2 } from 'node:crypto';
var check_key_length_default = (key, alg) => {
  let modulusLength;
  try {
    if (key instanceof KeyObject2) {
      modulusLength = key.asymmetricKeyDetails?.modulusLength;
    } else {
      modulusLength = Buffer.from(key.n, 'base64url').byteLength << 3;
    }
  } catch {}
  if (typeof modulusLength !== 'number' || modulusLength < 2048) {
    throw new TypeError(
      `${alg} requires key modulusLength to be 2048 bits or larger`
    );
  }
};

// node_modules/jose/dist/node/esm/runtime/jwk_to_key.js
import { createPrivateKey, createPublicKey } from 'node:crypto';
var parse = (key) => {
  if (key.d) {
    return createPrivateKey({ format: 'jwk', key });
  }
  return createPublicKey({ format: 'jwk', key });
};
var jwk_to_key_default = parse;

// node_modules/jose/dist/node/esm/key/import.js
async function importJWK(jwk, alg) {
  if (!isObject(jwk)) {
    throw new TypeError('JWK must be an object');
  }
  alg ||= jwk.alg;
  switch (jwk.kty) {
    case 'oct':
      if (typeof jwk.k !== 'string' || !jwk.k) {
        throw new TypeError('missing "k" (Key Value) Parameter value');
      }
      return decode(jwk.k);
    case 'RSA':
      if ('oth' in jwk && jwk.oth !== void 0) {
        throw new JOSENotSupported(
          'RSA JWK "oth" (Other Primes Info) Parameter value is not supported'
        );
      }
    case 'EC':
    case 'OKP':
      return jwk_to_key_default({ ...jwk, alg });
    default:
      throw new JOSENotSupported(
        'Unsupported "kty" (Key Type) Parameter value'
      );
  }
}

// node_modules/jose/dist/node/esm/lib/check_key_type.js
var tag = (key) => key?.[Symbol.toStringTag];
var jwkMatchesOp = (alg, key, usage) => {
  if (key.use !== void 0 && key.use !== 'sig') {
    throw new TypeError(
      'Invalid key for this operation, when present its use must be sig'
    );
  }
  if (key.key_ops !== void 0 && key.key_ops.includes?.(usage) !== true) {
    throw new TypeError(
      `Invalid key for this operation, when present its key_ops must include ${usage}`
    );
  }
  if (key.alg !== void 0 && key.alg !== alg) {
    throw new TypeError(
      `Invalid key for this operation, when present its alg must be ${alg}`
    );
  }
  return true;
};
var symmetricTypeCheck = (alg, key, usage, allowJwk) => {
  if (key instanceof Uint8Array) return;
  if (allowJwk && isJWK(key)) {
    if (isSecretJWK(key) && jwkMatchesOp(alg, key, usage)) return;
    throw new TypeError(
      `JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present`
    );
  }
  if (!is_key_like_default(key)) {
    throw new TypeError(
      withAlg(
        alg,
        key,
        ...types3,
        'Uint8Array',
        allowJwk ? 'JSON Web Key' : null
      )
    );
  }
  if (key.type !== 'secret') {
    throw new TypeError(
      `${tag(key)} instances for symmetric algorithms must be of type "secret"`
    );
  }
};
var asymmetricTypeCheck = (alg, key, usage, allowJwk) => {
  if (allowJwk && isJWK(key)) {
    switch (usage) {
      case 'sign':
        if (isPrivateJWK(key) && jwkMatchesOp(alg, key, usage)) return;
        throw new TypeError(`JSON Web Key for this operation be a private JWK`);
      case 'verify':
        if (isPublicJWK(key) && jwkMatchesOp(alg, key, usage)) return;
        throw new TypeError(`JSON Web Key for this operation be a public JWK`);
    }
  }
  if (!is_key_like_default(key)) {
    throw new TypeError(
      withAlg(alg, key, ...types3, allowJwk ? 'JSON Web Key' : null)
    );
  }
  if (key.type === 'secret') {
    throw new TypeError(
      `${tag(key)} instances for asymmetric algorithms must not be of type "secret"`
    );
  }
  if (usage === 'sign' && key.type === 'public') {
    throw new TypeError(
      `${tag(key)} instances for asymmetric algorithm signing must be of type "private"`
    );
  }
  if (usage === 'decrypt' && key.type === 'public') {
    throw new TypeError(
      `${tag(key)} instances for asymmetric algorithm decryption must be of type "private"`
    );
  }
  if (key.algorithm && usage === 'verify' && key.type === 'private') {
    throw new TypeError(
      `${tag(key)} instances for asymmetric algorithm verifying must be of type "public"`
    );
  }
  if (key.algorithm && usage === 'encrypt' && key.type === 'private') {
    throw new TypeError(
      `${tag(key)} instances for asymmetric algorithm encryption must be of type "public"`
    );
  }
};
function checkKeyType(allowJwk, alg, key, usage) {
  const symmetric =
    alg.startsWith('HS') ||
    alg === 'dir' ||
    alg.startsWith('PBES2') ||
    /^A\d{3}(?:GCM)?KW$/.test(alg);
  if (symmetric) {
    symmetricTypeCheck(alg, key, usage, allowJwk);
  } else {
    asymmetricTypeCheck(alg, key, usage, allowJwk);
  }
}
var check_key_type_default = checkKeyType.bind(void 0, false);
var checkKeyTypeWithJwk = checkKeyType.bind(void 0, true);

// node_modules/jose/dist/node/esm/lib/validate_crit.js
function validateCrit(
  Err,
  recognizedDefault,
  recognizedOption,
  protectedHeader,
  joseHeader
) {
  if (joseHeader.crit !== void 0 && protectedHeader?.crit === void 0) {
    throw new Err(
      '"crit" (Critical) Header Parameter MUST be integrity protected'
    );
  }
  if (!protectedHeader || protectedHeader.crit === void 0) {
    return /* @__PURE__ */ new Set();
  }
  if (
    !Array.isArray(protectedHeader.crit) ||
    protectedHeader.crit.length === 0 ||
    protectedHeader.crit.some(
      (input) => typeof input !== 'string' || input.length === 0
    )
  ) {
    throw new Err(
      '"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present'
    );
  }
  let recognized;
  if (recognizedOption !== void 0) {
    recognized = new Map([
      ...Object.entries(recognizedOption),
      ...recognizedDefault.entries(),
    ]);
  } else {
    recognized = recognizedDefault;
  }
  for (const parameter of protectedHeader.crit) {
    if (!recognized.has(parameter)) {
      throw new JOSENotSupported(
        `Extension Header Parameter "${parameter}" is not recognized`
      );
    }
    if (joseHeader[parameter] === void 0) {
      throw new Err(`Extension Header Parameter "${parameter}" is missing`);
    }
    if (recognized.get(parameter) && protectedHeader[parameter] === void 0) {
      throw new Err(
        `Extension Header Parameter "${parameter}" MUST be integrity protected`
      );
    }
  }
  return new Set(protectedHeader.crit);
}
var validate_crit_default = validateCrit;

// node_modules/jose/dist/node/esm/lib/validate_algorithms.js
var validateAlgorithms = (option, algorithms) => {
  if (
    algorithms !== void 0 &&
    (!Array.isArray(algorithms) ||
      algorithms.some((s) => typeof s !== 'string'))
  ) {
    throw new TypeError(`"${option}" option must be an array of strings`);
  }
  if (!algorithms) {
    return void 0;
  }
  return new Set(algorithms);
};
var validate_algorithms_default = validateAlgorithms;

// node_modules/jose/dist/node/esm/runtime/verify.js
import * as crypto5 from 'node:crypto';
import { promisify as promisify2 } from 'node:util';

// node_modules/jose/dist/node/esm/runtime/dsa_digest.js
function dsaDigest(alg) {
  switch (alg) {
    case 'PS256':
    case 'RS256':
    case 'ES256':
    case 'ES256K':
      return 'sha256';
    case 'PS384':
    case 'RS384':
    case 'ES384':
      return 'sha384';
    case 'PS512':
    case 'RS512':
    case 'ES512':
      return 'sha512';
    case 'Ed25519':
    case 'EdDSA':
      return void 0;
    default:
      throw new JOSENotSupported(
        `alg ${alg} is not supported either by JOSE or your javascript runtime`
      );
  }
}

// node_modules/jose/dist/node/esm/runtime/node_key.js
import { constants, KeyObject as KeyObject3 } from 'node:crypto';
var ecCurveAlgMap = /* @__PURE__ */ new Map([
  ['ES256', 'P-256'],
  ['ES256K', 'secp256k1'],
  ['ES384', 'P-384'],
  ['ES512', 'P-521'],
]);
function keyForCrypto(alg, key) {
  let asymmetricKeyType;
  let asymmetricKeyDetails;
  let isJWK2;
  if (key instanceof KeyObject3) {
    asymmetricKeyType = key.asymmetricKeyType;
    asymmetricKeyDetails = key.asymmetricKeyDetails;
  } else {
    isJWK2 = true;
    switch (key.kty) {
      case 'RSA':
        asymmetricKeyType = 'rsa';
        break;
      case 'EC':
        asymmetricKeyType = 'ec';
        break;
      case 'OKP': {
        if (key.crv === 'Ed25519') {
          asymmetricKeyType = 'ed25519';
          break;
        }
        if (key.crv === 'Ed448') {
          asymmetricKeyType = 'ed448';
          break;
        }
        throw new TypeError(
          'Invalid key for this operation, its crv must be Ed25519 or Ed448'
        );
      }
      default:
        throw new TypeError(
          'Invalid key for this operation, its kty must be RSA, OKP, or EC'
        );
    }
  }
  let options;
  switch (alg) {
    case 'Ed25519':
      if (asymmetricKeyType !== 'ed25519') {
        throw new TypeError(
          `Invalid key for this operation, its asymmetricKeyType must be ed25519`
        );
      }
      break;
    case 'EdDSA':
      if (!['ed25519', 'ed448'].includes(asymmetricKeyType)) {
        throw new TypeError(
          'Invalid key for this operation, its asymmetricKeyType must be ed25519 or ed448'
        );
      }
      break;
    case 'RS256':
    case 'RS384':
    case 'RS512':
      if (asymmetricKeyType !== 'rsa') {
        throw new TypeError(
          'Invalid key for this operation, its asymmetricKeyType must be rsa'
        );
      }
      check_key_length_default(key, alg);
      break;
    case 'PS256':
    case 'PS384':
    case 'PS512':
      if (asymmetricKeyType === 'rsa-pss') {
        const { hashAlgorithm, mgf1HashAlgorithm, saltLength } =
          asymmetricKeyDetails;
        const length = parseInt(alg.slice(-3), 10);
        if (
          hashAlgorithm !== void 0 &&
          (hashAlgorithm !== `sha${length}` ||
            mgf1HashAlgorithm !== hashAlgorithm)
        ) {
          throw new TypeError(
            `Invalid key for this operation, its RSA-PSS parameters do not meet the requirements of "alg" ${alg}`
          );
        }
        if (saltLength !== void 0 && saltLength > length >> 3) {
          throw new TypeError(
            `Invalid key for this operation, its RSA-PSS parameter saltLength does not meet the requirements of "alg" ${alg}`
          );
        }
      } else if (asymmetricKeyType !== 'rsa') {
        throw new TypeError(
          'Invalid key for this operation, its asymmetricKeyType must be rsa or rsa-pss'
        );
      }
      check_key_length_default(key, alg);
      options = {
        padding: constants.RSA_PKCS1_PSS_PADDING,
        saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
      };
      break;
    case 'ES256':
    case 'ES256K':
    case 'ES384':
    case 'ES512': {
      if (asymmetricKeyType !== 'ec') {
        throw new TypeError(
          'Invalid key for this operation, its asymmetricKeyType must be ec'
        );
      }
      const actual = get_named_curve_default(key);
      const expected = ecCurveAlgMap.get(alg);
      if (actual !== expected) {
        throw new TypeError(
          `Invalid key curve for the algorithm, its curve must be ${expected}, got ${actual}`
        );
      }
      options = { dsaEncoding: 'ieee-p1363' };
      break;
    }
    default:
      throw new JOSENotSupported(
        `alg ${alg} is not supported either by JOSE or your javascript runtime`
      );
  }
  if (isJWK2) {
    return { format: 'jwk', key, ...options };
  }
  return options ? { ...options, key } : key;
}

// node_modules/jose/dist/node/esm/runtime/sign.js
import * as crypto4 from 'node:crypto';
import { promisify } from 'node:util';

// node_modules/jose/dist/node/esm/runtime/hmac_digest.js
function hmacDigest(alg) {
  switch (alg) {
    case 'HS256':
      return 'sha256';
    case 'HS384':
      return 'sha384';
    case 'HS512':
      return 'sha512';
    default:
      throw new JOSENotSupported(
        `alg ${alg} is not supported either by JOSE or your javascript runtime`
      );
  }
}

// node_modules/jose/dist/node/esm/runtime/get_sign_verify_key.js
import { KeyObject as KeyObject4, createSecretKey } from 'node:crypto';
function getSignVerifyKey(alg, key, usage) {
  if (key instanceof Uint8Array) {
    if (!alg.startsWith('HS')) {
      throw new TypeError(invalid_key_input_default(key, ...types3));
    }
    return createSecretKey(key);
  }
  if (key instanceof KeyObject4) {
    return key;
  }
  if (isCryptoKey(key)) {
    checkSigCryptoKey(key, alg, usage);
    return KeyObject4.from(key);
  }
  if (isJWK(key)) {
    if (alg.startsWith('HS')) {
      return createSecretKey(Buffer.from(key.k, 'base64url'));
    }
    return key;
  }
  throw new TypeError(
    invalid_key_input_default(key, ...types3, 'Uint8Array', 'JSON Web Key')
  );
}

// node_modules/jose/dist/node/esm/runtime/sign.js
var oneShotSign = promisify(crypto4.sign);
var sign2 = async (alg, key, data) => {
  const k = getSignVerifyKey(alg, key, 'sign');
  if (alg.startsWith('HS')) {
    const hmac = crypto4.createHmac(hmacDigest(alg), k);
    hmac.update(data);
    return hmac.digest();
  }
  return oneShotSign(dsaDigest(alg), data, keyForCrypto(alg, k));
};
var sign_default = sign2;

// node_modules/jose/dist/node/esm/runtime/verify.js
var oneShotVerify = promisify2(crypto5.verify);
var verify2 = async (alg, key, signature, data) => {
  const k = getSignVerifyKey(alg, key, 'verify');
  if (alg.startsWith('HS')) {
    const expected = await sign_default(alg, k, data);
    const actual = signature;
    try {
      return crypto5.timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  }
  const algorithm = dsaDigest(alg);
  const keyInput = keyForCrypto(alg, k);
  try {
    return await oneShotVerify(algorithm, data, keyInput, signature);
  } catch {
    return false;
  }
};
var verify_default = verify2;

// node_modules/jose/dist/node/esm/jws/flattened/verify.js
async function flattenedVerify(jws, key, options) {
  if (!isObject(jws)) {
    throw new JWSInvalid('Flattened JWS must be an object');
  }
  if (jws.protected === void 0 && jws.header === void 0) {
    throw new JWSInvalid(
      'Flattened JWS must have either of the "protected" or "header" members'
    );
  }
  if (jws.protected !== void 0 && typeof jws.protected !== 'string') {
    throw new JWSInvalid('JWS Protected Header incorrect type');
  }
  if (jws.payload === void 0) {
    throw new JWSInvalid('JWS Payload missing');
  }
  if (typeof jws.signature !== 'string') {
    throw new JWSInvalid('JWS Signature missing or incorrect type');
  }
  if (jws.header !== void 0 && !isObject(jws.header)) {
    throw new JWSInvalid('JWS Unprotected Header incorrect type');
  }
  let parsedProt = {};
  if (jws.protected) {
    try {
      const protectedHeader = decode(jws.protected);
      parsedProt = JSON.parse(decoder.decode(protectedHeader));
    } catch {
      throw new JWSInvalid('JWS Protected Header is invalid');
    }
  }
  if (!is_disjoint_default(parsedProt, jws.header)) {
    throw new JWSInvalid(
      'JWS Protected and JWS Unprotected Header Parameter names must be disjoint'
    );
  }
  const joseHeader = {
    ...parsedProt,
    ...jws.header,
  };
  const extensions = validate_crit_default(
    JWSInvalid,
    /* @__PURE__ */ new Map([['b64', true]]),
    options?.crit,
    parsedProt,
    joseHeader
  );
  let b64 = true;
  if (extensions.has('b64')) {
    b64 = parsedProt.b64;
    if (typeof b64 !== 'boolean') {
      throw new JWSInvalid(
        'The "b64" (base64url-encode payload) Header Parameter must be a boolean'
      );
    }
  }
  const { alg } = joseHeader;
  if (typeof alg !== 'string' || !alg) {
    throw new JWSInvalid(
      'JWS "alg" (Algorithm) Header Parameter missing or invalid'
    );
  }
  const algorithms =
    options && validate_algorithms_default('algorithms', options.algorithms);
  if (algorithms && !algorithms.has(alg)) {
    throw new JOSEAlgNotAllowed(
      '"alg" (Algorithm) Header Parameter value not allowed'
    );
  }
  if (b64) {
    if (typeof jws.payload !== 'string') {
      throw new JWSInvalid('JWS Payload must be a string');
    }
  } else if (
    typeof jws.payload !== 'string' &&
    !(jws.payload instanceof Uint8Array)
  ) {
    throw new JWSInvalid(
      'JWS Payload must be a string or an Uint8Array instance'
    );
  }
  let resolvedKey = false;
  if (typeof key === 'function') {
    key = await key(parsedProt, jws);
    resolvedKey = true;
    checkKeyTypeWithJwk(alg, key, 'verify');
    if (isJWK(key)) {
      key = await importJWK(key, alg);
    }
  } else {
    checkKeyTypeWithJwk(alg, key, 'verify');
  }
  const data = concat(
    encoder.encode(jws.protected ?? ''),
    encoder.encode('.'),
    typeof jws.payload === 'string' ? encoder.encode(jws.payload) : jws.payload
  );
  let signature;
  try {
    signature = decode(jws.signature);
  } catch {
    throw new JWSInvalid('Failed to base64url decode the signature');
  }
  const verified = await verify_default(alg, key, signature, data);
  if (!verified) {
    throw new JWSSignatureVerificationFailed();
  }
  let payload;
  if (b64) {
    try {
      payload = decode(jws.payload);
    } catch {
      throw new JWSInvalid('Failed to base64url decode the payload');
    }
  } else if (typeof jws.payload === 'string') {
    payload = encoder.encode(jws.payload);
  } else {
    payload = jws.payload;
  }
  const result = { payload };
  if (jws.protected !== void 0) {
    result.protectedHeader = parsedProt;
  }
  if (jws.header !== void 0) {
    result.unprotectedHeader = jws.header;
  }
  if (resolvedKey) {
    return { ...result, key };
  }
  return result;
}

// node_modules/jose/dist/node/esm/jws/compact/verify.js
async function compactVerify(jws, key, options) {
  if (jws instanceof Uint8Array) {
    jws = decoder.decode(jws);
  }
  if (typeof jws !== 'string') {
    throw new JWSInvalid('Compact JWS must be a string or Uint8Array');
  }
  const {
    0: protectedHeader,
    1: payload,
    2: signature,
    length,
  } = jws.split('.');
  if (length !== 3) {
    throw new JWSInvalid('Invalid Compact JWS');
  }
  const verified = await flattenedVerify(
    { payload, protected: protectedHeader, signature },
    key,
    options
  );
  const result = {
    payload: verified.payload,
    protectedHeader: verified.protectedHeader,
  };
  if (typeof key === 'function') {
    return { ...result, key: verified.key };
  }
  return result;
}

// node_modules/jose/dist/node/esm/lib/epoch.js
var epoch_default = (date) => Math.floor(date.getTime() / 1e3);

// node_modules/jose/dist/node/esm/lib/secs.js
var minute = 60;
var hour = minute * 60;
var day = hour * 24;
var week = day * 7;
var year = day * 365.25;
var REGEX =
  /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i;
var secs_default = (str) => {
  const matched = REGEX.exec(str);
  if (!matched || (matched[4] && matched[1])) {
    throw new TypeError('Invalid time period format');
  }
  const value = parseFloat(matched[2]);
  const unit = matched[3].toLowerCase();
  let numericDate;
  switch (unit) {
    case 'sec':
    case 'secs':
    case 'second':
    case 'seconds':
    case 's':
      numericDate = Math.round(value);
      break;
    case 'minute':
    case 'minutes':
    case 'min':
    case 'mins':
    case 'm':
      numericDate = Math.round(value * minute);
      break;
    case 'hour':
    case 'hours':
    case 'hr':
    case 'hrs':
    case 'h':
      numericDate = Math.round(value * hour);
      break;
    case 'day':
    case 'days':
    case 'd':
      numericDate = Math.round(value * day);
      break;
    case 'week':
    case 'weeks':
    case 'w':
      numericDate = Math.round(value * week);
      break;
    default:
      numericDate = Math.round(value * year);
      break;
  }
  if (matched[1] === '-' || matched[4] === 'ago') {
    return -numericDate;
  }
  return numericDate;
};

// node_modules/jose/dist/node/esm/lib/jwt_claims_set.js
var normalizeTyp = (value) => value.toLowerCase().replace(/^application\//, '');
var checkAudiencePresence = (audPayload, audOption) => {
  if (typeof audPayload === 'string') {
    return audOption.includes(audPayload);
  }
  if (Array.isArray(audPayload)) {
    return audOption.some(Set.prototype.has.bind(new Set(audPayload)));
  }
  return false;
};
var jwt_claims_set_default = (
  protectedHeader,
  encodedPayload,
  options = {}
) => {
  let payload;
  try {
    payload = JSON.parse(decoder.decode(encodedPayload));
  } catch {}
  if (!isObject(payload)) {
    throw new JWTInvalid('JWT Claims Set must be a top-level JSON object');
  }
  const { typ } = options;
  if (
    typ &&
    (typeof protectedHeader.typ !== 'string' ||
      normalizeTyp(protectedHeader.typ) !== normalizeTyp(typ))
  ) {
    throw new JWTClaimValidationFailed(
      'unexpected "typ" JWT header value',
      payload,
      'typ',
      'check_failed'
    );
  }
  const {
    requiredClaims = [],
    issuer,
    subject,
    audience,
    maxTokenAge,
  } = options;
  const presenceCheck = [...requiredClaims];
  if (maxTokenAge !== void 0) presenceCheck.push('iat');
  if (audience !== void 0) presenceCheck.push('aud');
  if (subject !== void 0) presenceCheck.push('sub');
  if (issuer !== void 0) presenceCheck.push('iss');
  for (const claim of new Set(presenceCheck.reverse())) {
    if (!(claim in payload)) {
      throw new JWTClaimValidationFailed(
        `missing required "${claim}" claim`,
        payload,
        claim,
        'missing'
      );
    }
  }
  if (
    issuer &&
    !(Array.isArray(issuer) ? issuer : [issuer]).includes(payload.iss)
  ) {
    throw new JWTClaimValidationFailed(
      'unexpected "iss" claim value',
      payload,
      'iss',
      'check_failed'
    );
  }
  if (subject && payload.sub !== subject) {
    throw new JWTClaimValidationFailed(
      'unexpected "sub" claim value',
      payload,
      'sub',
      'check_failed'
    );
  }
  if (
    audience &&
    !checkAudiencePresence(
      payload.aud,
      typeof audience === 'string' ? [audience] : audience
    )
  ) {
    throw new JWTClaimValidationFailed(
      'unexpected "aud" claim value',
      payload,
      'aud',
      'check_failed'
    );
  }
  let tolerance;
  switch (typeof options.clockTolerance) {
    case 'string':
      tolerance = secs_default(options.clockTolerance);
      break;
    case 'number':
      tolerance = options.clockTolerance;
      break;
    case 'undefined':
      tolerance = 0;
      break;
    default:
      throw new TypeError('Invalid clockTolerance option type');
  }
  const { currentDate } = options;
  const now = epoch_default(currentDate || /* @__PURE__ */ new Date());
  if (
    (payload.iat !== void 0 || maxTokenAge) &&
    typeof payload.iat !== 'number'
  ) {
    throw new JWTClaimValidationFailed(
      '"iat" claim must be a number',
      payload,
      'iat',
      'invalid'
    );
  }
  if (payload.nbf !== void 0) {
    if (typeof payload.nbf !== 'number') {
      throw new JWTClaimValidationFailed(
        '"nbf" claim must be a number',
        payload,
        'nbf',
        'invalid'
      );
    }
    if (payload.nbf > now + tolerance) {
      throw new JWTClaimValidationFailed(
        '"nbf" claim timestamp check failed',
        payload,
        'nbf',
        'check_failed'
      );
    }
  }
  if (payload.exp !== void 0) {
    if (typeof payload.exp !== 'number') {
      throw new JWTClaimValidationFailed(
        '"exp" claim must be a number',
        payload,
        'exp',
        'invalid'
      );
    }
    if (payload.exp <= now - tolerance) {
      throw new JWTExpired(
        '"exp" claim timestamp check failed',
        payload,
        'exp',
        'check_failed'
      );
    }
  }
  if (maxTokenAge) {
    const age = now - payload.iat;
    const max =
      typeof maxTokenAge === 'number' ? maxTokenAge : secs_default(maxTokenAge);
    if (age - tolerance > max) {
      throw new JWTExpired(
        '"iat" claim timestamp check failed (too far in the past)',
        payload,
        'iat',
        'check_failed'
      );
    }
    if (age < 0 - tolerance) {
      throw new JWTClaimValidationFailed(
        '"iat" claim timestamp check failed (it should be in the past)',
        payload,
        'iat',
        'check_failed'
      );
    }
  }
  return payload;
};

// node_modules/jose/dist/node/esm/jwt/verify.js
async function jwtVerify(jwt, key, options) {
  const verified = await compactVerify(jwt, key, options);
  if (
    verified.protectedHeader.crit?.includes('b64') &&
    verified.protectedHeader.b64 === false
  ) {
    throw new JWTInvalid('JWTs MUST NOT use unencoded payload');
  }
  const payload = jwt_claims_set_default(
    verified.protectedHeader,
    verified.payload,
    options
  );
  const result = { payload, protectedHeader: verified.protectedHeader };
  if (typeof key === 'function') {
    return { ...result, key: verified.key };
  }
  return result;
}

// node_modules/@shopify/shopify-api/dist/esm/lib/utils/get-hmac-key.mjs
function getHMACKey(key) {
  const arrayBuffer = new Uint8Array(key.length);
  for (let i = 0, keyLen = key.length; i < keyLen; i++) {
    arrayBuffer[i] = key.charCodeAt(i);
  }
  return arrayBuffer;
}

// node_modules/@shopify/shopify-api/dist/esm/lib/session/decode-session-token.mjs
var JWT_PERMITTED_CLOCK_TOLERANCE = 10;
function decodeSessionToken(config) {
  return async (token, { checkAudience = true } = {}) => {
    let payload;
    try {
      payload = (
        await jwtVerify(token, getHMACKey(config.apiSecretKey), {
          algorithms: ['HS256'],
          clockTolerance: JWT_PERMITTED_CLOCK_TOLERANCE,
        })
      ).payload;
    } catch (error) {
      throw new InvalidJwtError(
        `Failed to parse session token '${token}': ${error.message}`
      );
    }
    if (checkAudience && payload.aud !== config.apiKey) {
      throw new InvalidJwtError('Session token had invalid API key');
    }
    return payload;
  };
}

// node_modules/@shopify/shopify-api/dist/esm/lib/session/session-utils.mjs
function getJwtSessionId(config) {
  return (shop, userId) => {
    return `${sanitizeShop(config)(shop, true)}_${userId}`;
  };
}
function getOfflineId(config) {
  return (shop) => {
    return `offline_${sanitizeShop(config)(shop, true)}`;
  };
}
function getCurrentSessionId(config) {
  return async function getCurrentSessionId2({ isOnline, ...adapterArgs }) {
    const request2 = await abstractConvertRequest(adapterArgs);
    const log2 = logger(config);
    if (config.isEmbeddedApp) {
      log2.debug('App is embedded, looking for session id in JWT payload', {
        isOnline,
      });
      const authHeader = request2.headers.Authorization;
      if (authHeader) {
        const matches = (
          typeof authHeader === 'string' ? authHeader : authHeader[0]
        ).match(/^Bearer (.+)$/);
        if (!matches) {
          log2.error('Missing Bearer token in authorization header', {
            isOnline,
          });
          throw new MissingJwtTokenError(
            'Missing Bearer token in authorization header'
          );
        }
        const jwtPayload = await decodeSessionToken(config)(matches[1]);
        const shop = jwtPayload.dest.replace(/^https:\/\//, '');
        log2.debug('Found valid JWT payload', { shop, isOnline });
        if (isOnline) {
          return getJwtSessionId(config)(shop, jwtPayload.sub);
        } else {
          return getOfflineId(config)(shop);
        }
      } else {
        log2.error(
          'Missing Authorization header, was the request made with authenticatedFetch?',
          { isOnline }
        );
      }
    } else {
      log2.debug('App is not embedded, looking for session id in cookies', {
        isOnline,
      });
      const cookies = new Cookies(
        request2,
        {},
        {
          keys: [config.apiSecretKey],
        }
      );
      return cookies.getAndVerify(SESSION_COOKIE_NAME);
    }
    return void 0;
  };
}
function customAppSession(config) {
  return (shop) => {
    return new Session({
      id: '',
      shop: `${sanitizeShop(config)(shop, true)}`,
      state: '',
      isOnline: false,
    });
  };
}

// node_modules/@shopify/shopify-api/dist/esm/lib/auth/oauth/create-session.mjs
function createSession({ config, accessTokenResponse, shop, state }) {
  const associatedUser = accessTokenResponse.associated_user;
  const isOnline = Boolean(associatedUser);
  logger(config).info('Creating new session', { shop, isOnline });
  const getSessionExpiration = (expires_in) =>
    new Date(Date.now() + expires_in * 1e3);
  const getOnlineSessionProperties = (responseBody) => {
    const { access_token, scope, ...rest } = responseBody;
    const sessionId = config.isEmbeddedApp
      ? getJwtSessionId(config)(shop, `${rest.associated_user.id}`)
      : v4();
    return {
      id: sessionId,
      onlineAccessInfo: rest,
      expires: getSessionExpiration(rest.expires_in),
    };
  };
  const getOfflineSessionProperties = (responseBody) => {
    const { expires_in } = responseBody;
    return {
      id: getOfflineId(config)(shop),
      ...(expires_in && { expires: getSessionExpiration(expires_in) }),
    };
  };
  return new Session({
    shop,
    state,
    isOnline,
    accessToken: accessTokenResponse.access_token,
    scope: accessTokenResponse.scope,
    ...(isOnline
      ? getOnlineSessionProperties(accessTokenResponse)
      : getOfflineSessionProperties(accessTokenResponse)),
  });
}

// node_modules/@shopify/shopify-api/dist/esm/lib/auth/oauth/oauth.mjs
var logForBot = ({ request: request2, log: log2, func }) => {
  log2.debug(`Possible bot request to auth ${func}: `, {
    userAgent: request2.headers['User-Agent'],
  });
};
function begin(config) {
  return async ({ shop, callbackPath, isOnline, ...adapterArgs }) => {
    throwIfCustomStoreApp(
      config.isCustomStoreApp,
      'Cannot perform OAuth for private apps'
    );
    const log2 = logger(config);
    log2.info('Beginning OAuth', { shop, isOnline, callbackPath });
    const request2 = await abstractConvertRequest(adapterArgs);
    const response = await abstractConvertIncomingResponse(adapterArgs);
    let userAgent = request2.headers['User-Agent'];
    if (Array.isArray(userAgent)) {
      userAgent = userAgent[0];
    }
    if (isbot(userAgent)) {
      logForBot({ request: request2, log: log2, func: 'begin' });
      response.statusCode = 410;
      return abstractConvertResponse(response, adapterArgs);
    }
    const cookies = new Cookies(request2, response, {
      keys: [config.apiSecretKey],
      secure: true,
    });
    const state = nonce();
    await cookies.setAndSign(STATE_COOKIE_NAME, state, {
      expires: new Date(Date.now() + 6e4),
      sameSite: 'lax',
      secure: true,
      path: callbackPath,
    });
    const scopes = config.scopes ? config.scopes.toString() : '';
    const query = {
      client_id: config.apiKey,
      scope: scopes,
      redirect_uri: `${config.hostScheme}://${config.hostName}${callbackPath}`,
      state,
      'grant_options[]': isOnline ? 'per-user' : '',
    };
    const processedQuery = new ProcessedQuery();
    processedQuery.putAll(query);
    const cleanShop = sanitizeShop(config)(shop, true);
    const redirectUrl = `https://${cleanShop}/admin/oauth/authorize${processedQuery.stringify()}`;
    response.statusCode = 302;
    response.statusText = 'Found';
    response.headers = {
      ...response.headers,
      ...cookies.response.headers,
      Location: redirectUrl,
    };
    log2.debug(`OAuth started, redirecting to ${redirectUrl}`, {
      shop,
      isOnline,
    });
    return abstractConvertResponse(response, adapterArgs);
  };
}
function callback(config) {
  return async function callback2({ ...adapterArgs }) {
    throwIfCustomStoreApp(
      config.isCustomStoreApp,
      'Cannot perform OAuth for private apps'
    );
    const log2 = logger(config);
    const request2 = await abstractConvertRequest(adapterArgs);
    const query = new URL(
      request2.url,
      `${config.hostScheme}://${config.hostName}`
    ).searchParams;
    const shop = query.get('shop');
    const response = {};
    let userAgent = request2.headers['User-Agent'];
    if (Array.isArray(userAgent)) {
      userAgent = userAgent[0];
    }
    if (isbot(userAgent)) {
      logForBot({ request: request2, log: log2, func: 'callback' });
      throw new BotActivityDetected('Invalid OAuth callback initiated by bot');
    }
    log2.info('Completing OAuth', { shop });
    const cookies = new Cookies(request2, response, {
      keys: [config.apiSecretKey],
      secure: true,
    });
    const stateFromCookie = await cookies.getAndVerify(STATE_COOKIE_NAME);
    cookies.deleteCookie(STATE_COOKIE_NAME);
    if (!stateFromCookie) {
      log2.error('Could not find OAuth cookie', { shop });
      throw new CookieNotFound(
        `Cannot complete OAuth process. Could not find an OAuth cookie for shop url: ${shop}`
      );
    }
    const authQuery = Object.fromEntries(query.entries());
    if (!(await validQuery({ config, query: authQuery, stateFromCookie }))) {
      log2.error('Invalid OAuth callback', { shop, stateFromCookie });
      throw new InvalidOAuthError('Invalid OAuth callback.');
    }
    log2.debug('OAuth request is valid, requesting access token', { shop });
    const body = {
      client_id: config.apiKey,
      client_secret: config.apiSecretKey,
      code: query.get('code'),
    };
    const cleanShop = sanitizeShop(config)(query.get('shop'), true);
    const postResponse = await fetchRequestFactory(config)(
      `https://${cleanShop}/admin/oauth/access_token`,
      {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': DataType.JSON,
          Accept: DataType.JSON,
        },
      }
    );
    if (!postResponse.ok) {
      throwFailedRequest(await postResponse.json(), false, postResponse);
    }
    const session = createSession({
      accessTokenResponse: await postResponse.json(),
      shop: cleanShop,
      state: stateFromCookie,
      config,
    });
    if (!config.isEmbeddedApp) {
      await cookies.setAndSign(SESSION_COOKIE_NAME, session.id, {
        expires: session.expires,
        sameSite: 'lax',
        secure: true,
        path: '/',
      });
    }
    return {
      headers: await abstractConvertHeaders(
        cookies.response.headers,
        adapterArgs
      ),
      session,
    };
  };
}
async function validQuery({ config, query, stateFromCookie }) {
  return (
    (await validateHmac(config)(query)) &&
    safeCompare(query.state, stateFromCookie)
  );
}
function throwIfCustomStoreApp(isCustomStoreApp, message2) {
  if (isCustomStoreApp) {
    throw new PrivateAppError(message2);
  }
}

// node_modules/@shopify/shopify-api/dist/esm/lib/auth/get-embedded-app-url.mjs
function getEmbeddedAppUrl(config) {
  return async ({ ...adapterArgs }) => {
    const request2 = await abstractConvertRequest(adapterArgs);
    if (!request2) {
      throw new MissingRequiredArgument(
        'getEmbeddedAppUrl requires a request object argument'
      );
    }
    if (!request2.url) {
      throw new InvalidRequestError('Request does not contain a URL');
    }
    const url = new URL(request2.url, `https://${request2.headers.host}`);
    const host = url.searchParams.get('host');
    if (typeof host !== 'string') {
      throw new InvalidRequestError(
        'Request does not contain a host query parameter'
      );
    }
    return buildEmbeddedAppUrl(config)(host);
  };
}
function buildEmbeddedAppUrl(config) {
  return (host) => {
    sanitizeHost()(host, true);
    const decodedHost = decodeHost(host);
    return `https://${decodedHost}/apps/${config.apiKey}`;
  };
}

// node_modules/@shopify/shopify-api/dist/esm/lib/auth/oauth/token-exchange.mjs
var RequestedTokenType;
(function (RequestedTokenType2) {
  RequestedTokenType2['OnlineAccessToken'] =
    'urn:shopify:params:oauth:token-type:online-access-token';
  RequestedTokenType2['OfflineAccessToken'] =
    'urn:shopify:params:oauth:token-type:offline-access-token';
})(RequestedTokenType || (RequestedTokenType = {}));
var TokenExchangeGrantType = 'urn:ietf:params:oauth:grant-type:token-exchange';
var IdTokenType = 'urn:ietf:params:oauth:token-type:id_token';
function tokenExchange(config) {
  return async ({ shop, sessionToken, requestedTokenType }) => {
    await decodeSessionToken(config)(sessionToken);
    const body = {
      client_id: config.apiKey,
      client_secret: config.apiSecretKey,
      grant_type: TokenExchangeGrantType,
      subject_token: sessionToken,
      subject_token_type: IdTokenType,
      requested_token_type: requestedTokenType,
    };
    const cleanShop = sanitizeShop(config)(shop, true);
    const postResponse = await fetchRequestFactory(config)(
      `https://${cleanShop}/admin/oauth/access_token`,
      {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': DataType.JSON,
          Accept: DataType.JSON,
        },
      }
    );
    if (!postResponse.ok) {
      throwFailedRequest(await postResponse.json(), false, postResponse);
    }
    return {
      session: createSession({
        accessTokenResponse: await postResponse.json(),
        shop: cleanShop,
        // We need to keep this as an empty string as our template DB schemas have this required
        state: '',
        config,
      }),
    };
  };
}

// node_modules/@shopify/shopify-api/dist/esm/lib/auth/oauth/client-credentials.mjs
var ClientCredentialsGrantType = 'client_credentials';
function clientCredentials(config) {
  return async ({ shop }) => {
    const cleanShop = sanitizeShop(config)(shop, true);
    const requestConfig = {
      method: 'POST',
      body: JSON.stringify({
        client_id: config.apiKey,
        client_secret: config.apiSecretKey,
        grant_type: ClientCredentialsGrantType,
      }),
      headers: {
        'Content-Type': DataType.JSON,
        Accept: DataType.JSON,
      },
    };
    const postResponse = await fetchRequestFactory(config)(
      `https://${cleanShop}/admin/oauth/access_token`,
      requestConfig
    );
    const responseData = await postResponse.json();
    if (!postResponse.ok) {
      throwFailedRequest(responseData, false, postResponse);
    }
    return {
      session: createSession({
        accessTokenResponse: responseData,
        shop: cleanShop,
        // We need to keep this as an empty string as our template DB schemas have this required
        state: '',
        config,
      }),
    };
  };
}

// node_modules/@shopify/shopify-api/dist/esm/lib/auth/index.mjs
function shopifyAuth(config) {
  const shopify3 = {
    begin: begin(config),
    callback: callback(config),
    nonce,
    safeCompare,
    getEmbeddedAppUrl: getEmbeddedAppUrl(config),
    buildEmbeddedAppUrl: buildEmbeddedAppUrl(config),
    tokenExchange: tokenExchange(config),
    clientCredentials: clientCredentials(config),
  };
  return shopify3;
}

// node_modules/@shopify/shopify-api/dist/esm/lib/session/index.mjs
function shopifySession(config) {
  return {
    customAppSession: customAppSession(config),
    getCurrentId: getCurrentSessionId(config),
    getOfflineId: getOfflineId(config),
    getJwtSessionId: getJwtSessionId(config),
    decodeSessionToken: decodeSessionToken(config),
  };
}

// node_modules/@shopify/shopify-api/dist/esm/lib/utils/version-compatible.mjs
function versionCompatible(config) {
  return (referenceVersion, currentVersion = config.apiVersion) => {
    if (currentVersion === ApiVersion.Unstable) {
      return true;
    }
    const numericVersion = (version) => parseInt(version.replace('-', ''), 10);
    const current = numericVersion(currentVersion);
    const reference = numericVersion(referenceVersion);
    return current >= reference;
  };
}
function versionPriorTo(config) {
  return (referenceVersion, currentVersion = config.apiVersion) => {
    return !versionCompatible(config)(referenceVersion, currentVersion);
  };
}

// node_modules/@shopify/shopify-api/dist/esm/lib/utils/index.mjs
function shopifyUtils(config) {
  return {
    sanitizeShop: sanitizeShop(config),
    sanitizeHost: sanitizeHost(),
    validateHmac: validateHmac(config),
    versionCompatible: versionCompatible(config),
    versionPriorTo: versionPriorTo(config),
    shopAdminUrlToLegacyUrl,
    legacyUrlToShopAdminUrl,
  };
}

// node_modules/@shopify/shopify-api/dist/esm/lib/webhooks/types.mjs
var DeliveryMethod;
(function (DeliveryMethod2) {
  DeliveryMethod2['Http'] = 'http';
  DeliveryMethod2['EventBridge'] = 'eventbridge';
  DeliveryMethod2['PubSub'] = 'pubsub';
})(DeliveryMethod || (DeliveryMethod = {}));
var WebhookOperation;
(function (WebhookOperation2) {
  WebhookOperation2['Create'] = 'create';
  WebhookOperation2['Update'] = 'update';
  WebhookOperation2['Delete'] = 'delete';
})(WebhookOperation || (WebhookOperation = {}));
var WebhookValidationErrorReason = {
  ...ValidationErrorReason,
  MissingHeaders: 'missing_headers',
};

// node_modules/@shopify/shopify-api/dist/esm/lib/webhooks/registry.mjs
function registry() {
  return {};
}
function topicForStorage(topic) {
  return topic.toUpperCase().replace(/\/|\./g, '_');
}
function addHandlers(config, webhookRegistry) {
  return function addHandlers2(handlersToAdd) {
    for (const [topic, handlers] of Object.entries(handlersToAdd)) {
      const topicKey = topicForStorage(topic);
      if (Array.isArray(handlers)) {
        for (const handler of handlers) {
          mergeOrAddHandler(config, webhookRegistry, topicKey, handler);
        }
      } else {
        mergeOrAddHandler(config, webhookRegistry, topicKey, handlers);
      }
    }
  };
}
function getTopicsAdded(webhookRegistry) {
  return function getTopicsAdded2() {
    return Object.keys(webhookRegistry);
  };
}
function getHandlers(webhookRegistry) {
  return function getHandlers2(topic) {
    return webhookRegistry[topicForStorage(topic)] || [];
  };
}
function handlerIdentifier(config, handler) {
  const prefix = handler.deliveryMethod;
  switch (handler.deliveryMethod) {
    case DeliveryMethod.Http:
      return `${prefix}_${addHostToCallbackUrl(config, handler.callbackUrl)}`;
    case DeliveryMethod.EventBridge:
      return `${prefix}_${handler.arn}`;
    case DeliveryMethod.PubSub:
      return `${prefix}_${handler.pubSubProject}:${handler.pubSubTopic}`;
    default:
      throw new InvalidDeliveryMethodError(
        `Unrecognized delivery method '${handler.deliveryMethod}'`
      );
  }
}
function addHostToCallbackUrl(config, callbackUrl) {
  if (callbackUrl.startsWith('/')) {
    return `${config.hostScheme}://${config.hostName}${callbackUrl}`;
  } else {
    return callbackUrl;
  }
}
function mergeOrAddHandler(config, webhookRegistry, topic, handler) {
  const log2 = logger(config);
  handler.includeFields?.sort();
  handler.metafieldNamespaces?.sort();
  if (!(topic in webhookRegistry)) {
    webhookRegistry[topic] = [handler];
    return;
  }
  const identifier = handlerIdentifier(config, handler);
  for (const index in webhookRegistry[topic]) {
    if (!Object.prototype.hasOwnProperty.call(webhookRegistry[topic], index)) {
      continue;
    }
    const existingHandler = webhookRegistry[topic][index];
    const existingIdentifier = handlerIdentifier(config, existingHandler);
    if (identifier !== existingIdentifier) {
      continue;
    }
    if (handler.deliveryMethod === DeliveryMethod.Http) {
      log2.info(
        `Detected multiple handlers for '${topic}', webhooks.process will call them sequentially`
      );
      break;
    } else {
      throw new InvalidDeliveryMethodError(
        `Can only add multiple handlers for a topic when deliveryMethod is Http. Please be sure that you used addHandler method once after creating ShopifyApi instance in your app.  Invalid handler: ${JSON.stringify(handler)}`
      );
    }
  }
  webhookRegistry[topic].push(handler);
}

// node_modules/@shopify/shopify-api/dist/esm/lib/webhooks/query-template.mjs
function queryTemplate(template, params) {
  let query = template;
  Object.entries(params).forEach(([key, value]) => {
    query = query.replace(`{{${key}}}`, value);
  });
  return query;
}

// node_modules/@shopify/shopify-api/dist/esm/lib/webhooks/register.mjs
function register(config, webhookRegistry) {
  return async function register2({ session }) {
    const log2 = logger(config);
    log2.info('Registering webhooks', { shop: session.shop });
    const registerReturn = Object.keys(webhookRegistry).reduce((acc, topic) => {
      acc[topic] = [];
      return acc;
    }, {});
    const existingHandlers = await getExistingHandlers(config, session);
    log2.debug(
      `Existing topics: [${Object.keys(existingHandlers).join(', ')}]`,
      { shop: session.shop }
    );
    for (const topic in webhookRegistry) {
      if (!Object.prototype.hasOwnProperty.call(webhookRegistry, topic)) {
        continue;
      }
      if (privacyTopics.includes(topic)) {
        continue;
      }
      registerReturn[topic] = await registerTopic({
        config,
        session,
        topic,
        existingHandlers: existingHandlers[topic] || [],
        handlers: getHandlers(webhookRegistry)(topic),
      });
      delete existingHandlers[topic];
    }
    for (const topic in existingHandlers) {
      if (!Object.prototype.hasOwnProperty.call(existingHandlers, topic)) {
        continue;
      }
      const GraphqlClient2 = graphqlClientClass({ config });
      const client = new GraphqlClient2({ session });
      registerReturn[topic] = await runMutations({
        config,
        client,
        topic,
        handlers: existingHandlers[topic],
        operation: WebhookOperation.Delete,
      });
    }
    return registerReturn;
  };
}
async function getExistingHandlers(config, session) {
  const GraphqlClient2 = graphqlClientClass({ config });
  const client = new GraphqlClient2({ session });
  const existingHandlers = {};
  let hasNextPage;
  let endCursor = null;
  do {
    const query = buildCheckQuery(endCursor);
    const response = await client.request(query);
    response.data?.webhookSubscriptions?.edges.forEach((edge) => {
      const handler = buildHandlerFromNode(edge);
      if (!existingHandlers[edge.node.topic]) {
        existingHandlers[edge.node.topic] = [];
      }
      existingHandlers[edge.node.topic].push(handler);
    });
    endCursor = response.data?.webhookSubscriptions?.pageInfo.endCursor;
    hasNextPage = response.data?.webhookSubscriptions?.pageInfo.hasNextPage;
  } while (hasNextPage);
  return existingHandlers;
}
function buildCheckQuery(endCursor) {
  return queryTemplate(TEMPLATE_GET_HANDLERS, {
    END_CURSOR: JSON.stringify(endCursor),
  });
}
function buildHandlerFromNode(edge) {
  const endpoint = edge.node.endpoint;
  let handler;
  switch (endpoint.__typename) {
    case 'WebhookHttpEndpoint':
      handler = {
        deliveryMethod: DeliveryMethod.Http,
        callbackUrl: endpoint.callbackUrl,
        // This is a dummy for now because we don't really care about it
        callback: async () => {},
      };
      break;
    case 'WebhookEventBridgeEndpoint':
      handler = {
        deliveryMethod: DeliveryMethod.EventBridge,
        arn: endpoint.arn,
      };
      break;
    case 'WebhookPubSubEndpoint':
      handler = {
        deliveryMethod: DeliveryMethod.PubSub,
        pubSubProject: endpoint.pubSubProject,
        pubSubTopic: endpoint.pubSubTopic,
      };
      break;
  }
  handler.id = edge.node.id;
  handler.includeFields = edge.node.includeFields;
  handler.metafieldNamespaces = edge.node.metafieldNamespaces;
  handler.includeFields?.sort();
  handler.metafieldNamespaces?.sort();
  return handler;
}
async function registerTopic({
  config,
  session,
  topic,
  existingHandlers,
  handlers,
}) {
  let registerResults = [];
  const { toCreate, toUpdate, toDelete } = categorizeHandlers(
    config,
    existingHandlers,
    handlers
  );
  const GraphqlClient2 = graphqlClientClass({ config });
  const client = new GraphqlClient2({ session });
  let operation = WebhookOperation.Create;
  registerResults = registerResults.concat(
    await runMutations({ config, client, topic, operation, handlers: toCreate })
  );
  operation = WebhookOperation.Update;
  registerResults = registerResults.concat(
    await runMutations({ config, client, topic, operation, handlers: toUpdate })
  );
  operation = WebhookOperation.Delete;
  registerResults = registerResults.concat(
    await runMutations({ config, client, topic, operation, handlers: toDelete })
  );
  return registerResults;
}
function categorizeHandlers(config, existingHandlers, handlers) {
  const handlersByKey = handlers.reduce((acc, value) => {
    acc[handlerIdentifier(config, value)] = value;
    return acc;
  }, {});
  const existingHandlersByKey = existingHandlers.reduce((acc, value) => {
    acc[handlerIdentifier(config, value)] = value;
    return acc;
  }, {});
  const toCreate = { ...handlersByKey };
  const toUpdate = {};
  const toDelete = {};
  for (const existingKey in existingHandlersByKey) {
    if (
      !Object.prototype.hasOwnProperty.call(existingHandlersByKey, existingKey)
    ) {
      continue;
    }
    const existingHandler = existingHandlersByKey[existingKey];
    const handler = handlersByKey[existingKey];
    if (existingKey in handlersByKey) {
      delete toCreate[existingKey];
      if (!areHandlerFieldsEqual(existingHandler, handler)) {
        toUpdate[existingKey] = handler;
        toUpdate[existingKey].id = existingHandler.id;
      }
    } else {
      toDelete[existingKey] = existingHandler;
    }
  }
  return {
    toCreate: Object.values(toCreate),
    toUpdate: Object.values(toUpdate),
    toDelete: Object.values(toDelete),
  };
}
function areHandlerFieldsEqual(arr1, arr2) {
  const includeFieldsEqual = arraysEqual(
    arr1.includeFields || [],
    arr2.includeFields || []
  );
  const metafieldNamespacesEqual = arraysEqual(
    arr1.metafieldNamespaces || [],
    arr2.metafieldNamespaces || []
  );
  return includeFieldsEqual && metafieldNamespacesEqual;
}
function arraysEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}
async function runMutations({ config, client, topic, handlers, operation }) {
  const registerResults = [];
  for (const handler of handlers) {
    registerResults.push(
      await runMutation({ config, client, topic, handler, operation })
    );
  }
  return registerResults;
}
async function runMutation({ config, client, topic, handler, operation }) {
  let registerResult;
  logger(config).debug(`Running webhook mutation`, { topic, operation });
  try {
    const query = buildMutation(config, topic, handler, operation);
    const result = await client.request(query);
    registerResult = {
      deliveryMethod: handler.deliveryMethod,
      success: isSuccess(result, handler, operation),
      result,
      operation,
    };
  } catch (error) {
    if (error instanceof InvalidDeliveryMethodError) {
      registerResult = {
        deliveryMethod: handler.deliveryMethod,
        success: false,
        result: { message: error.message },
        operation,
      };
    } else {
      throw error;
    }
  }
  return registerResult;
}
function buildMutation(config, topic, handler, operation) {
  const params = {};
  let identifier;
  if (handler.id) {
    identifier = `id: "${handler.id}"`;
  } else {
    identifier = `topic: ${topic}`;
  }
  const mutationArguments = {
    MUTATION_NAME: getMutationName(handler, operation),
    IDENTIFIER: identifier,
    MUTATION_PARAMS: '',
  };
  if (operation !== WebhookOperation.Delete) {
    switch (handler.deliveryMethod) {
      case DeliveryMethod.Http:
        params.callbackUrl = `"${addHostToCallbackUrl(config, handler.callbackUrl)}"`;
        break;
      case DeliveryMethod.EventBridge:
        params.arn = `"${handler.arn}"`;
        break;
      case DeliveryMethod.PubSub:
        params.pubSubProject = `"${handler.pubSubProject}"`;
        params.pubSubTopic = `"${handler.pubSubTopic}"`;
        break;
      default:
        throw new InvalidDeliveryMethodError(
          `Unrecognized delivery method '${handler.deliveryMethod}'`
        );
    }
    if (handler.includeFields) {
      params.includeFields = JSON.stringify(handler.includeFields);
    }
    if (handler.metafieldNamespaces) {
      params.metafieldNamespaces = JSON.stringify(handler.metafieldNamespaces);
    }
    if (handler.subTopic) {
      const subTopicString = `subTopic: "${handler.subTopic}",`;
      mutationArguments.MUTATION_PARAMS = subTopicString;
    }
    const paramsString = Object.entries(params)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    mutationArguments.MUTATION_PARAMS += `webhookSubscription: {${paramsString}}`;
  }
  return queryTemplate(TEMPLATE_MUTATION, mutationArguments);
}
function getMutationName(handler, operation) {
  switch (operation) {
    case WebhookOperation.Create:
      return `${getEndpoint(handler)}Create`;
    case WebhookOperation.Update:
      return `${getEndpoint(handler)}Update`;
    case WebhookOperation.Delete:
      return 'webhookSubscriptionDelete';
    default:
      throw new ShopifyError(`Unrecognized operation '${operation}'`);
  }
}
function getEndpoint(handler) {
  switch (handler.deliveryMethod) {
    case DeliveryMethod.Http:
      return 'webhookSubscription';
    case DeliveryMethod.EventBridge:
      return 'eventBridgeWebhookSubscription';
    case DeliveryMethod.PubSub:
      return 'pubSubWebhookSubscription';
    default:
      throw new ShopifyError(
        `Unrecognized delivery method '${handler.deliveryMethod}'`
      );
  }
}
function isSuccess(result, handler, operation) {
  const mutationName = getMutationName(handler, operation);
  return Boolean(
    result.data &&
    result.data[mutationName] &&
    result.data[mutationName].userErrors.length === 0
  );
}
var TEMPLATE_GET_HANDLERS = `query shopifyApiReadWebhookSubscriptions {
  webhookSubscriptions(
    first: 250,
    after: {{END_CURSOR}},
  ) {
    edges {
      node {
        id
        topic
        includeFields
        metafieldNamespaces
        endpoint {
          __typename
          ... on WebhookHttpEndpoint {
            callbackUrl
          }
          ... on WebhookEventBridgeEndpoint {
            arn
          }
          ... on WebhookPubSubEndpoint {
            pubSubProject
            pubSubTopic
          }
        }
      }
    }
    pageInfo {
      endCursor
      hasNextPage
    }
  }
}`;
var TEMPLATE_MUTATION = `
  mutation shopifyApiCreateWebhookSubscription {
    {{MUTATION_NAME}}(
      {{IDENTIFIER}},
      {{MUTATION_PARAMS}}
    ) {
      userErrors {
        field
        message
      }
    }
  }
`;

// node_modules/@shopify/shopify-api/dist/esm/lib/webhooks/validate.mjs
var OPTIONAL_HANDLER_PROPERTIES = {
  subTopic: ShopifyHeader.SubTopic,
};
var HANDLER_PROPERTIES = {
  apiVersion: ShopifyHeader.ApiVersion,
  domain: ShopifyHeader.Domain,
  hmac: ShopifyHeader.Hmac,
  topic: ShopifyHeader.Topic,
  webhookId: ShopifyHeader.WebhookId,
  ...OPTIONAL_HANDLER_PROPERTIES,
};
function validateFactory(config) {
  return async function validate({ rawBody, ...adapterArgs }) {
    const request2 = await abstractConvertRequest(adapterArgs);
    const validHmacResult = await validateHmacFromRequestFactory(config)({
      type: HmacValidationType.Webhook,
      rawBody,
      ...adapterArgs,
    });
    if (!validHmacResult.valid) {
      if (validHmacResult.reason === ValidationErrorReason.InvalidHmac) {
        const log2 = logger(config);
        await log2.debug(
          "Webhook HMAC validation failed. Please note that events manually triggered from a store's Notifications settings will fail this validation. To test this, please use the CLI or trigger the actual event in a development store."
        );
      }
      return validHmacResult;
    }
    return checkWebhookHeaders(request2.headers);
  };
}
function checkWebhookHeaders(headers) {
  const missingHeaders = [];
  const entries = Object.entries(HANDLER_PROPERTIES);
  const headerValues = entries.reduce((acc, [property, headerName]) => {
    const headerValue = getHeader(headers, headerName);
    if (headerValue) {
      acc[property] = headerValue;
    } else if (!(property in OPTIONAL_HANDLER_PROPERTIES)) {
      missingHeaders.push(headerName);
    }
    return acc;
  }, {});
  if (missingHeaders.length) {
    return {
      valid: false,
      reason: WebhookValidationErrorReason.MissingHeaders,
      missingHeaders,
    };
  } else {
    return {
      valid: true,
      ...headerValues,
      ...(headerValues.subTopic ? { subTopic: headerValues.subTopic } : {}),
      topic: topicForStorage(headerValues.topic),
    };
  }
}

// node_modules/@shopify/shopify-api/dist/esm/lib/webhooks/process.mjs
var STATUS_TEXT_LOOKUP = {
  [StatusCode.Ok]: 'OK',
  [StatusCode.BadRequest]: 'Bad Request',
  [StatusCode.Unauthorized]: 'Unauthorized',
  [StatusCode.NotFound]: 'Not Found',
  [StatusCode.InternalServerError]: 'Internal Server Error',
};
function process2(config, webhookRegistry) {
  return async function process3({ context, rawBody, ...adapterArgs }) {
    const response = {
      statusCode: StatusCode.Ok,
      statusText: STATUS_TEXT_LOOKUP[StatusCode.Ok],
      headers: {},
    };
    await logger(config).info('Receiving webhook request');
    const webhookCheck = await validateFactory(config)({
      rawBody,
      ...adapterArgs,
    });
    let errorMessage = 'Unknown error while handling webhook';
    if (webhookCheck.valid) {
      const handlerResult = await callWebhookHandlers(
        config,
        webhookRegistry,
        webhookCheck,
        rawBody,
        context
      );
      response.statusCode = handlerResult.statusCode;
      if (!isOK(response)) {
        errorMessage = handlerResult.errorMessage || errorMessage;
      }
    } else {
      const errorResult = await handleInvalidWebhook(config, webhookCheck);
      response.statusCode = errorResult.statusCode;
      response.statusText = STATUS_TEXT_LOOKUP[response.statusCode];
      errorMessage = errorResult.errorMessage;
    }
    const returnResponse = await abstractConvertResponse(response, adapterArgs);
    if (!isOK(response)) {
      throw new InvalidWebhookError({
        message: errorMessage,
        response: returnResponse,
      });
    }
    return Promise.resolve(returnResponse);
  };
}
async function callWebhookHandlers(
  config,
  webhookRegistry,
  webhookCheck,
  rawBody,
  context
) {
  const log2 = logger(config);
  const { hmac: _hmac, valid: _valid, ...loggingContext } = webhookCheck;
  await log2.debug(
    'Webhook request is valid, looking for HTTP handlers to call',
    loggingContext
  );
  const handlers = webhookRegistry[webhookCheck.topic] || [];
  const response = { statusCode: StatusCode.Ok };
  let found = false;
  for (const handler of handlers) {
    if (handler.deliveryMethod !== DeliveryMethod.Http) {
      continue;
    }
    if (!handler.callback) {
      response.statusCode = StatusCode.InternalServerError;
      response.errorMessage =
        "Cannot call webhooks.process with a webhook handler that doesn't have a callback";
      throw new MissingWebhookCallbackError({
        message: response.errorMessage,
        response,
      });
    }
    found = true;
    await log2.debug('Found HTTP handler, triggering it', loggingContext);
    try {
      await handler.callback(
        webhookCheck.topic,
        webhookCheck.domain,
        rawBody,
        webhookCheck.webhookId,
        webhookCheck.apiVersion,
        ...(webhookCheck?.subTopic ? webhookCheck.subTopic : ''),
        context
      );
    } catch (error) {
      response.statusCode = StatusCode.InternalServerError;
      response.errorMessage = error.message;
    }
  }
  if (!found) {
    await log2.debug('No HTTP handlers found', loggingContext);
    response.statusCode = StatusCode.NotFound;
    response.errorMessage = `No HTTP webhooks registered for topic ${webhookCheck.topic}`;
  }
  return response;
}
async function handleInvalidWebhook(config, webhookCheck) {
  const response = {
    statusCode: StatusCode.InternalServerError,
    errorMessage: 'Unknown error while handling webhook',
  };
  switch (webhookCheck.reason) {
    case WebhookValidationErrorReason.MissingHeaders:
      response.statusCode = StatusCode.BadRequest;
      response.errorMessage = `Missing one or more of the required HTTP headers to process webhooks: [${webhookCheck.missingHeaders.join(', ')}]`;
      break;
    case WebhookValidationErrorReason.MissingBody:
      response.statusCode = StatusCode.BadRequest;
      response.errorMessage = 'No body was received when processing webhook';
      break;
    case WebhookValidationErrorReason.MissingHmac:
      response.statusCode = StatusCode.BadRequest;
      response.errorMessage = `Missing HMAC header in request`;
      break;
    case WebhookValidationErrorReason.InvalidHmac:
      response.statusCode = StatusCode.Unauthorized;
      response.errorMessage = `Could not validate request HMAC`;
      break;
  }
  await logger(config).debug(
    `Webhook request is invalid, returning ${response.statusCode}: ${response.errorMessage}`
  );
  return response;
}

// node_modules/@shopify/shopify-api/dist/esm/lib/webhooks/index.mjs
function shopifyWebhooks(config) {
  const webhookRegistry = registry();
  return {
    addHandlers: addHandlers(config, webhookRegistry),
    getTopicsAdded: getTopicsAdded(webhookRegistry),
    getHandlers: getHandlers(webhookRegistry),
    register: register(config, webhookRegistry),
    process: process2(config, webhookRegistry),
    validate: validateFactory(config),
  };
}

// node_modules/@shopify/shopify-api/dist/esm/lib/billing/types.mjs
var APP_SUBSCRIPTION_FRAGMENT = `
  fragment AppSubscriptionFragment on AppSubscription {
    id
    name
    test
    status
    trialDays
    createdAt
    currentPeriodEnd
    returnUrl
    lineItems {
      id
      plan {
        pricingDetails {
          ... on AppRecurringPricing {
            price {
              amount
              currencyCode
            }
            interval
            discount {
              durationLimitInIntervals
              remainingDurationInIntervals
              priceAfterDiscount {
                amount
              }
              value {
                ... on AppSubscriptionDiscountAmount {
                  amount {
                    amount
                    currencyCode
                  }
                }
                ... on AppSubscriptionDiscountPercentage {
                  percentage
                }
              }
            }
          }
          ... on AppUsagePricing {
            balanceUsed {
              amount
              currencyCode
            }
            cappedAmount {
              amount
              currencyCode
            }
            terms
          }
        }
      }
    }
  }
`;

// node_modules/@shopify/shopify-api/dist/esm/lib/billing/utils.mjs
function convertMoneyAmount(data) {
  if (!data) return data;
  convertAppUsagePricingMoney(data);
  convertAppRecurringPricingMoney(data);
  convertAppDiscountMoney(data);
  return data;
}
function convertAppRecurringPricingMoney(data) {
  if (!data) return;
  if (data.price?.amount && typeof data.price.amount === 'string') {
    data.price.amount = parseFloat(data.price.amount);
  }
}
function convertAppDiscountMoney(data) {
  if (!data) return;
  if (
    data.discount?.priceAfterDiscount?.amount &&
    typeof data.discount.priceAfterDiscount.amount === 'string'
  ) {
    data.discount.priceAfterDiscount.amount = parseFloat(
      data.discount.priceAfterDiscount.amount
    );
  }
  if (
    data.discount?.value?.amount?.amount &&
    typeof data.discount.value.amount.amount === 'string'
  ) {
    data.discount.value.amount.amount = parseFloat(
      data.discount.value.amount.amount
    );
  }
}
function convertAppUsagePricingMoney(data) {
  if (!data) return;
  if (data.balanceUsed?.amount && typeof data.balanceUsed.amount === 'string') {
    data.balanceUsed.amount = parseFloat(data.balanceUsed.amount);
  }
  if (
    data.cappedAmount?.amount &&
    typeof data.cappedAmount.amount === 'string'
  ) {
    data.cappedAmount.amount = parseFloat(data.cappedAmount.amount);
  }
}
function convertLineItems(lineItems) {
  return lineItems.map((item) => {
    if (item.plan?.pricingDetails) {
      item.plan.pricingDetails = convertMoneyAmount(item.plan.pricingDetails);
    }
    return item;
  });
}

// node_modules/@shopify/shopify-api/dist/esm/lib/billing/check.mjs
function check(config) {
  return async function check2(params) {
    if (!config.future?.unstable_managedPricingSupport && !config.billing) {
      throw new BillingError({
        message: 'Attempted to look for purchases without billing configs',
        errorData: [],
      });
    }
    const { session, isTest = true, plans } = params;
    const returnObject = params.returnObject ?? false;
    const GraphqlClient2 = graphqlClientClass({ config });
    const client = new GraphqlClient2({ session });
    const payments = await assessPayments({ client, isTest, plans });
    if (config.future?.unstable_managedPricingSupport || returnObject) {
      return payments;
    } else {
      return payments.hasActivePayment;
    }
  };
}
async function assessPayments({ client, isTest, plans }) {
  const returnValue = {
    hasActivePayment: false,
    oneTimePurchases: [],
    appSubscriptions: [],
  };
  let installation;
  let endCursor = null;
  do {
    const currentInstallations = await client.request(HAS_PAYMENTS_QUERY, {
      variables: { endCursor },
    });
    installation = currentInstallations.data?.currentAppInstallation;
    installation.activeSubscriptions.forEach((subscription) => {
      if (subscriptionMeetsCriteria({ subscription, isTest, plans })) {
        returnValue.hasActivePayment = true;
        if (subscription.lineItems) {
          subscription.lineItems = convertLineItems(subscription.lineItems);
        }
        returnValue.appSubscriptions.push(subscription);
      }
    });
    installation.oneTimePurchases.edges.forEach(({ node: purchase }) => {
      if (purchaseMeetsCriteria({ purchase, isTest, plans })) {
        returnValue.hasActivePayment = true;
        returnValue.oneTimePurchases.push(purchase);
      }
    });
    endCursor = installation.oneTimePurchases.pageInfo.endCursor;
  } while (installation?.oneTimePurchases.pageInfo.hasNextPage);
  return returnValue;
}
function subscriptionMeetsCriteria({ subscription, isTest, plans }) {
  return (
    (typeof plans === 'undefined' || plans.includes(subscription.name)) &&
    (isTest || !subscription.test)
  );
}
function purchaseMeetsCriteria({ purchase, isTest, plans }) {
  return (
    (typeof plans === 'undefined' || plans.includes(purchase.name)) &&
    (isTest || !purchase.test) &&
    purchase.status === 'ACTIVE'
  );
}
var HAS_PAYMENTS_QUERY = `
  ${APP_SUBSCRIPTION_FRAGMENT}
  query appSubscription($endCursor: String) {
    currentAppInstallation {
      activeSubscriptions {
        ...AppSubscriptionFragment
      }
      oneTimePurchases(first: 250, sortKey: CREATED_AT, after: $endCursor) {
        edges {
          node {
            id
            name
            test
            status
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

// node_modules/@shopify/shopify-api/dist/esm/lib/billing/request.mjs
var RECURRING_PURCHASE_MUTATION = `
  ${APP_SUBSCRIPTION_FRAGMENT}
  mutation AppSubscriptionCreate(
    $name: String!
    $returnUrl: URL!
    $test: Boolean
    $trialDays: Int
    $replacementBehavior: AppSubscriptionReplacementBehavior
    $lineItems: [AppSubscriptionLineItemInput!]!
  ) {
    appSubscriptionCreate(
      name: $name
      returnUrl: $returnUrl
      test: $test
      trialDays: $trialDays
      replacementBehavior: $replacementBehavior
      lineItems: $lineItems
    ) {
      appSubscription {
        ...AppSubscriptionFragment
      }
      confirmationUrl
      userErrors {
        field
        message
      }
    }
  }
`;
var ONE_TIME_PURCHASE_MUTATION = `
  mutation test(
    $name: String!
    $price: MoneyInput!
    $returnUrl: URL!
    $test: Boolean
  ) {
    appPurchaseOneTimeCreate(
      name: $name
      price: $price
      returnUrl: $returnUrl
      test: $test
    ) {
      appPurchaseOneTime {
        id
        name
        test
      }
      confirmationUrl
      userErrors {
        field
        message
      }
    }
  }
`;
function request(config) {
  return async function ({
    session,
    plan,
    isTest = true,
    returnUrl: returnUrlParam,
    returnObject = false,
    ...overrides
  }) {
    if (!config.billing || !config.billing[plan]) {
      throw new BillingError({
        message: `Could not find plan ${plan} in billing settings`,
        errorData: [],
      });
    }
    const billingConfig = {
      ...config.billing[plan],
    };
    const filteredOverrides = Object.fromEntries(
      Object.entries(overrides).filter(([_key, value]) => value !== void 0)
    );
    const cleanShopName = session.shop.replace('.myshopify.com', '');
    const embeddedAppUrl = buildEmbeddedAppUrl(config)(
      hashString(`admin.shopify.com/store/${cleanShopName}`, HashFormat.Base64)
    );
    const appUrl = `${config.hostScheme}://${config.hostName}?shop=${session.shop}`;
    const returnUrl =
      returnUrlParam || (config.isEmbeddedApp ? embeddedAppUrl : appUrl);
    const GraphqlClient2 = graphqlClientClass({ config });
    const client = new GraphqlClient2({ session });
    function isLineItemPlan(billingConfig2) {
      return 'lineItems' in billingConfig2;
    }
    function isOneTimePlan(billingConfig2) {
      return billingConfig2.interval === BillingInterval.OneTime;
    }
    let data;
    if (isLineItemPlan(billingConfig)) {
      const mergedBillingConfigs = mergeBillingConfigs(
        billingConfig,
        filteredOverrides
      );
      const mutationRecurringResponse = await requestSubscriptionPayment({
        billingConfig: mergedBillingConfigs,
        plan,
        client,
        returnUrl,
        isTest,
      });
      data = mutationRecurringResponse.appSubscriptionCreate;
    } else if (isOneTimePlan(billingConfig)) {
      const mutationOneTimeResponse = await requestSinglePayment({
        billingConfig: { ...billingConfig, ...filteredOverrides },
        plan,
        client,
        returnUrl,
        isTest,
      });
      data = mutationOneTimeResponse.appPurchaseOneTimeCreate;
    } else {
      switch (billingConfig.interval) {
        case BillingInterval.Usage: {
          const mutationUsageResponse = await requestUsagePayment({
            billingConfig: { ...billingConfig, ...filteredOverrides },
            plan,
            client,
            returnUrl,
            isTest,
          });
          data = mutationUsageResponse.appSubscriptionCreate;
          break;
        }
        default: {
          const mutationRecurringResponse = await requestRecurringPayment({
            billingConfig: { ...billingConfig, ...filteredOverrides },
            plan,
            client,
            returnUrl,
            isTest,
          });
          data = mutationRecurringResponse.appSubscriptionCreate;
        }
      }
    }
    if (data.userErrors?.length) {
      throw new BillingError({
        message: 'Error while billing the store',
        errorData: data.userErrors,
      });
    }
    if (returnObject) {
      return data;
    } else {
      return data.confirmationUrl;
    }
  };
}
async function requestSubscriptionPayment({
  billingConfig,
  plan,
  client,
  returnUrl,
  isTest,
}) {
  const lineItems = billingConfig.lineItems.map((item) => {
    if (
      item.interval === BillingInterval.Every30Days ||
      item.interval === BillingInterval.Annual
    ) {
      const appRecurringPricingDetails = {
        interval: item.interval,
        price: {
          amount: item.amount,
          currencyCode: item.currencyCode,
        },
      };
      if (item.discount) {
        appRecurringPricingDetails.discount = {
          durationLimitInIntervals: item.discount.durationLimitInIntervals,
          value: {
            amount: item.discount.value.amount,
            percentage: item.discount.value.percentage,
          },
        };
      }
      return {
        plan: {
          appRecurringPricingDetails,
        },
      };
    } else if (item.interval === BillingInterval.Usage) {
      const appUsagePricingDetails = {
        terms: item.terms,
        cappedAmount: {
          amount: item.amount,
          currencyCode: item.currencyCode,
        },
      };
      return {
        plan: {
          appUsagePricingDetails,
        },
      };
    } else {
      throw new BillingError({
        message: 'Invalid interval provided',
        errorData: [item],
      });
    }
  });
  const mutationResponse = await client.request(RECURRING_PURCHASE_MUTATION, {
    variables: {
      name: plan,
      trialDays: billingConfig.trialDays,
      replacementBehavior: billingConfig.replacementBehavior,
      returnUrl,
      test: isTest,
      lineItems,
    },
  });
  if (mutationResponse.errors) {
    throw new BillingError({
      message: 'Error while billing the store',
      errorData: mutationResponse.errors,
    });
  }
  return mutationResponse.data;
}
async function requestRecurringPayment({
  billingConfig,
  plan,
  client,
  returnUrl,
  isTest,
}) {
  const mutationResponse = await client.request(RECURRING_PURCHASE_MUTATION, {
    variables: {
      name: plan,
      returnUrl,
      test: isTest,
      trialDays: billingConfig.trialDays,
      replacementBehavior: billingConfig.replacementBehavior,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              interval: billingConfig.interval,
              price: {
                amount: billingConfig.amount,
                currencyCode: billingConfig.currencyCode,
              },
              discount: billingConfig.discount
                ? {
                    durationLimitInIntervals:
                      billingConfig.discount?.durationLimitInIntervals,
                    value: {
                      amount: billingConfig.discount?.value?.amount,
                      percentage: billingConfig.discount?.value?.percentage,
                    },
                  }
                : void 0,
            },
          },
        },
      ],
    },
  });
  if (mutationResponse.data?.appSubscriptionCreate?.userErrors.length) {
    throw new BillingError({
      message: 'Error while creating a subscription',
      errorData: mutationResponse.data?.appSubscriptionCreate?.userErrors,
    });
  }
  return mutationResponse.data;
}
async function requestUsagePayment({
  billingConfig,
  plan,
  client,
  returnUrl,
  isTest,
}) {
  const mutationResponse = await client.request(RECURRING_PURCHASE_MUTATION, {
    variables: {
      name: plan,
      returnUrl,
      test: isTest,
      trialDays: billingConfig.trialDays,
      replacementBehavior: billingConfig.replacementBehavior,
      lineItems: [
        {
          plan: {
            appUsagePricingDetails: {
              terms: billingConfig.usageTerms,
              cappedAmount: {
                amount: billingConfig.amount,
                currencyCode: billingConfig.currencyCode,
              },
            },
          },
        },
      ],
    },
  });
  if (mutationResponse.data?.appSubscriptionCreate?.userErrors.length) {
    throw new BillingError({
      message: 'Error while creating a subscription',
      errorData: mutationResponse.data?.appSubscriptionCreate?.userErrors,
    });
  }
  return mutationResponse.data;
}
async function requestSinglePayment({
  billingConfig,
  plan,
  client,
  returnUrl,
  isTest,
}) {
  const mutationResponse = await client.request(ONE_TIME_PURCHASE_MUTATION, {
    variables: {
      name: plan,
      returnUrl,
      test: isTest,
      price: {
        amount: billingConfig.amount,
        currencyCode: billingConfig.currencyCode,
      },
    },
  });
  if (mutationResponse.errors) {
    throw new BillingError({
      message: 'Error while billing the store',
      errorData: mutationResponse.errors,
    });
  }
  return mutationResponse.data;
}
function mergeBillingConfigs(billingConfig, overrides) {
  const mergedConfig = { ...billingConfig, ...overrides };
  const mergedLineItems = [];
  if (billingConfig.lineItems && overrides.lineItems) {
    for (const i of billingConfig.lineItems) {
      let found = false;
      for (const j of overrides.lineItems) {
        if (i.interval === j.interval) {
          mergedLineItems.push({ ...i, ...j });
          found = true;
          break;
        }
      }
      if (!found) {
        mergedLineItems.push(i);
      }
    }
    mergedConfig.lineItems = mergedLineItems;
  }
  return mergedConfig;
}

// node_modules/@shopify/shopify-api/dist/esm/lib/billing/cancel.mjs
var CANCEL_MUTATION = `
  ${APP_SUBSCRIPTION_FRAGMENT}
  mutation appSubscriptionCancel($id: ID!, $prorate: Boolean) {
    appSubscriptionCancel(id: $id, prorate: $prorate) {
      appSubscription {
        ...AppSubscriptionFragment
      }
      userErrors {
        field
        message
      }
    }
  }
`;
function cancel(config) {
  return async function (subscriptionInfo) {
    const { session, subscriptionId, prorate = true } = subscriptionInfo;
    const GraphqlClient2 = graphqlClientClass({ config });
    const client = new GraphqlClient2({ session });
    try {
      const response = await client.request(CANCEL_MUTATION, {
        variables: { id: subscriptionId, prorate },
      });
      if (response.data?.appSubscriptionCancel?.userErrors.length) {
        throw new BillingError({
          message: 'Error while canceling a subscription',
          errorData: response.data?.appSubscriptionCancel?.userErrors,
        });
      }
      return response.data?.appSubscriptionCancel?.appSubscription;
    } catch (error) {
      if (error instanceof GraphqlQueryError) {
        throw new BillingError({
          message: error.message,
          errorData: error.response?.errors,
        });
      } else {
        throw error;
      }
    }
  };
}

// node_modules/@shopify/shopify-api/dist/esm/lib/billing/subscriptions.mjs
var SUBSCRIPTION_QUERY = `
${APP_SUBSCRIPTION_FRAGMENT}
query appSubscription {
  currentAppInstallation {
    activeSubscriptions {
      ...AppSubscriptionFragment
    }
  }
}
`;
function subscriptions(config) {
  return async function ({ session }) {
    if (!config.future?.unstable_managedPricingSupport && !config.billing) {
      throw new BillingError({
        message: 'Attempted to look for purchases without billing configs',
        errorData: [],
      });
    }
    const GraphqlClient2 = graphqlClientClass({ config });
    const client = new GraphqlClient2({ session });
    const response = await client.request(SUBSCRIPTION_QUERY);
    if (!response.data?.currentAppInstallation?.activeSubscriptions) {
      return { activeSubscriptions: [] };
    }
    const activeSubscriptions =
      response.data.currentAppInstallation.activeSubscriptions;
    activeSubscriptions.forEach((subscription) => {
      if (subscription.lineItems) {
        subscription.lineItems = convertLineItems(subscription.lineItems);
      }
    });
    return {
      activeSubscriptions,
    };
  };
}

// node_modules/@shopify/shopify-api/dist/esm/lib/billing/create-usage-record.mjs
var CREATE_USAGE_RECORD_MUTATION = `
mutation appUsageRecordCreate($description: String!, $price: MoneyInput!, $subscriptionLineItemId: ID!) {
  appUsageRecordCreate(description: $description, price: $price, subscriptionLineItemId: $subscriptionLineItemId) {
    userErrors {
      field
      message
    }
    appUsageRecord {
      id
      description
      idempotencyKey
      price {
        amount
        currencyCode
      }
      subscriptionLineItem {
        id
        plan {
          pricingDetails {
            ... on AppUsagePricing {
              balanceUsed {
                amount
                currencyCode
              }
              cappedAmount {
                amount
                currencyCode
              }
              terms
            }
          }
        }
      }
    }
  }
}
`;
function createUsageRecord(config) {
  return async function createUsageRecord2(usageRecordInfo) {
    const {
      session,
      subscriptionLineItemId,
      description,
      price,
      idempotencyKey,
      isTest = true,
    } = usageRecordInfo;
    const GraphqlClient2 = graphqlClientClass({ config });
    const client = new GraphqlClient2({ session });
    const usageSubscriptionLineItemId = subscriptionLineItemId
      ? subscriptionLineItemId
      : await getUsageRecordSubscriptionLineItemId({ client, isTest });
    const variables = {
      description,
      price,
      subscriptionLineItemId: usageSubscriptionLineItemId,
    };
    if (idempotencyKey) {
      variables.idempotencyKey = idempotencyKey;
    }
    try {
      const response = await client.request(CREATE_USAGE_RECORD_MUTATION, {
        variables,
      });
      if (response.data?.appUsageRecordCreate?.userErrors.length) {
        throw new BillingError({
          message: 'Error while creating a usage record',
          errorData: response.data?.appUsageRecordCreate?.userErrors,
        });
      }
      const appUsageRecord =
        response.data?.appUsageRecordCreate?.appUsageRecord;
      convertAppRecurringPricingMoney(appUsageRecord.price);
      convertAppUsagePricingMoney(
        appUsageRecord.subscriptionLineItem.plan.pricingDetails
      );
      return appUsageRecord;
    } catch (error) {
      if (error instanceof GraphqlQueryError) {
        throw new BillingError({
          message: error.message,
          errorData: error.response?.errors,
        });
      } else {
        throw error;
      }
    }
  };
}
async function getUsageRecordSubscriptionLineItemId({ client, isTest }) {
  const payments = await assessPayments({ client, isTest });
  if (!payments.hasActivePayment) {
    throw new BillingError({
      message: 'No active payment found',
      errorData: [],
    });
  }
  if (!payments.appSubscriptions.length) {
    throw new BillingError({
      message: 'No active subscriptions found',
      errorData: [],
    });
  }
  if (payments.appSubscriptions) {
    const usageSubscriptionLineItemId = getUsageLineItemId(
      payments.appSubscriptions
    );
    return usageSubscriptionLineItemId;
  }
  throw new BillingError({
    message: 'Unable to find active subscription line item',
    errorData: [],
  });
}
function getUsageLineItemId(subscriptions2) {
  for (const subscription of subscriptions2) {
    if (subscription.status === 'ACTIVE' && subscription.lineItems) {
      for (const lineItem of subscription.lineItems) {
        if ('balanceUsed' in lineItem.plan.pricingDetails) {
          return lineItem.id;
        }
      }
    }
  }
  throw new BillingError({
    message: 'No active usage subscription found',
    errorData: [],
  });
}

// node_modules/@shopify/shopify-api/dist/esm/lib/billing/update-usage-subscription-capped-amount.mjs
var UPDATE_USAGE_CAPPED_AMOUNT_MUTATION = `
${APP_SUBSCRIPTION_FRAGMENT}
mutation appSubscriptionLineItemUpdate($cappedAmount: MoneyInput!, $id: ID!) {
  appSubscriptionLineItemUpdate(cappedAmount: $cappedAmount, id: $id) {
    userErrors {
      field
      message
    }
    confirmationUrl
    appSubscription {
      ...AppSubscriptionFragment
    }
  }
}
`;
function updateUsageCappedAmount(config) {
  return async function updateUsageCappedAmount2(params) {
    if (!config.billing) {
      throw new BillingError({
        message: 'Attempted to update line item without billing configs',
        errorData: [],
      });
    }
    const {
      session,
      subscriptionLineItemId,
      cappedAmount: { amount, currencyCode },
    } = params;
    const GraphqlClient2 = graphqlClientClass({ config });
    const client = new GraphqlClient2({ session });
    try {
      const response = await client.request(
        UPDATE_USAGE_CAPPED_AMOUNT_MUTATION,
        {
          variables: {
            id: subscriptionLineItemId,
            cappedAmount: {
              amount,
              currencyCode,
            },
          },
        }
      );
      if (response.data?.appSubscriptionLineItemUpdate?.userErrors.length) {
        throw new BillingError({
          message: 'Error while updating usage subscription capped amount',
          errorData: response.data?.appSubscriptionLineItemUpdate?.userErrors,
        });
      }
      const appSubscription =
        response.data?.appSubscriptionLineItemUpdate?.appSubscription;
      if (appSubscription && appSubscription.lineItems) {
        appSubscription.lineItems = convertLineItems(appSubscription.lineItems);
      }
      return {
        confirmationUrl:
          response.data?.appSubscriptionLineItemUpdate?.confirmationUrl,
        appSubscription,
      };
    } catch (error) {
      if (error instanceof GraphqlQueryError) {
        throw new BillingError({
          message: error.message,
          errorData: error.response?.errors,
        });
      }
      throw error;
    }
  };
}

// node_modules/@shopify/shopify-api/dist/esm/lib/billing/index.mjs
function shopifyBilling(config) {
  return {
    check: check(config),
    request: request(config),
    cancel: cancel(config),
    subscriptions: subscriptions(config),
    createUsageRecord: createUsageRecord(config),
    updateUsageCappedAmount: updateUsageCappedAmount(config),
  };
}

// node_modules/@shopify/shopify-api/dist/esm/lib/flow/validate.mjs
function validateFactory2(config) {
  return async function validate({ rawBody, ...adapterArgs }) {
    return validateHmacFromRequestFactory(config)({
      type: HmacValidationType.Flow,
      rawBody,
      ...adapterArgs,
    });
  };
}

// node_modules/@shopify/shopify-api/dist/esm/lib/flow/index.mjs
function shopifyFlow(config) {
  return {
    validate: validateFactory2(config),
  };
}

// node_modules/@shopify/shopify-api/dist/esm/lib/fulfillment-service/validate.mjs
function validateFactory3(config) {
  return async function validate({ rawBody, ...adapterArgs }) {
    return validateHmacFromRequestFactory(config)({
      type: HmacValidationType.FulfillmentService,
      rawBody,
      ...adapterArgs,
    });
  };
}

// node_modules/@shopify/shopify-api/dist/esm/lib/fulfillment-service/index.mjs
function fulfillmentService(config) {
  return {
    validate: validateFactory3(config),
  };
}

// node_modules/@shopify/shopify-api/dist/esm/lib/index.mjs
function shopifyApi({ future, restResources, ...config }) {
  const libConfig = { ...config, future, restResources };
  const validatedConfig = validateConfig(libConfig);
  const shopify3 = {
    config: validatedConfig,
    clients: clientClasses(validatedConfig),
    auth: shopifyAuth(validatedConfig),
    session: shopifySession(validatedConfig),
    utils: shopifyUtils(validatedConfig),
    webhooks: shopifyWebhooks(validatedConfig),
    billing: shopifyBilling(validatedConfig),
    flow: shopifyFlow(validatedConfig),
    fulfillmentService: fulfillmentService(validatedConfig),
    logger: logger(validatedConfig),
    rest: {},
  };
  if (restResources) {
    shopify3.rest = loadRestResources({
      resources: restResources,
      config: validatedConfig,
      RestClient: restClientClass({ config: validatedConfig }),
    });
  }
  shopify3.logger
    .info(
      `version ${SHOPIFY_API_LIBRARY_VERSION}, environment ${abstractRuntimeString()}`
    )
    .catch((err) => console.log(err));
  logDisabledFutureFlags(validatedConfig, shopify3.logger);
  return shopify3;
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/boundary/error.mjs
import { jsx } from 'react/jsx-runtime';

// node_modules/@shopify/shopify-app-remix/dist/esm/server/version.mjs
var SHOPIFY_REMIX_LIBRARY_VERSION = '3.8.5';

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/webhooks/register.mjs
function registerWebhooksFactory({ api, logger: logger2 }) {
  return async function registerWebhooks2({ session }) {
    return api.webhooks
      .register({ session })
      .then((response) => {
        Object.entries(response).forEach(([topic, topicResults]) => {
          topicResults.forEach(({ success, ...rest }) => {
            if (success) {
              logger2.debug('Registered webhook', {
                topic,
                shop: session.shop,
                operation: rest.operation,
              });
            } else {
              logger2.error('Failed to register webhook', {
                topic,
                shop: session.shop,
                result: JSON.stringify(rest.result),
              });
            }
          });
        });
        return response;
      })
      .catch((error) => {
        const graphQLErrors = error.body?.errors?.graphQLErrors || [];
        const throttled = graphQLErrors.find(
          ({ extensions: { code } }) => code === 'THROTTLED'
        );
        if (throttled) {
          logger2.error('Failed to register webhooks', {
            shop: session.shop,
            error: JSON.stringify(error),
          });
        } else {
          throw error;
        }
      });
  };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/helpers/ensure-cors-headers.mjs
function ensureCORSHeadersFactory(params, request2, corsHeaders = []) {
  const { logger: logger2, config } = params;
  return function ensureCORSHeaders(response) {
    const origin = request2.headers.get('Origin');
    if (origin && origin !== config.appUrl) {
      logger2.debug(
        'Request comes from a different origin, adding CORS headers'
      );
      const corsHeadersSet = /* @__PURE__ */ new Set([
        'Authorization',
        'Content-Type',
        ...corsHeaders,
      ]);
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set(
        'Access-Control-Allow-Headers',
        [...corsHeadersSet].join(', ')
      );
      response.headers.set('Access-Control-Expose-Headers', REAUTH_URL_HEADER);
    }
    return response;
  };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/helpers/redirect-to-bounce-page.mjs
import { redirect } from '@remix-run/server-runtime';
var redirectToBouncePage = (params, url) => {
  const { config } = params;
  const searchParams = url.searchParams;
  searchParams.delete('id_token');
  searchParams.set(
    'shopify-reload',
    `${config.appUrl}${url.pathname}?${searchParams.toString()}`
  );
  throw redirect(
    `${config.auth.patchSessionTokenPath}?${searchParams.toString()}`
  );
};

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/helpers/respond-to-invalid-session-token.mjs
function respondToInvalidSessionToken({
  params,
  request: request2,
  retryRequest = false,
}) {
  const { api, logger: logger2, config } = params;
  const isDocumentRequest = !request2.headers.get('authorization');
  if (isDocumentRequest) {
    return redirectToBouncePage({ config }, new URL(request2.url));
  }
  throw new Response(void 0, {
    status: 401,
    statusText: 'Unauthorized',
    headers: retryRequest ? RETRY_INVALID_SESSION_HEADER : {},
  });
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/helpers/get-shop-from-request.mjs
function getShopFromRequest(request2) {
  const url = new URL(request2.url);
  return url.searchParams.get('shop');
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/helpers/validate-session-token.mjs
async function validateSessionToken(
  params,
  request2,
  token,
  { checkAudience = true, retryRequest = true } = {}
) {
  const { api, logger: logger2 } = params;
  const shop = getShopFromRequest(request2);
  logger2.debug('Validating session token', { shop });
  try {
    const payload = await api.session.decodeSessionToken(token, {
      checkAudience,
    });
    logger2.debug('Session token is valid - validated', {
      shop,
      payload: JSON.stringify(payload),
    });
    return payload;
  } catch (error) {
    logger2.debug(`Failed to validate session token: ${error.message}`, {
      shop,
    });
    throw respondToInvalidSessionToken({
      params,
      request: request2,
      retryRequest,
    });
  }
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/helpers/get-session-token-header.mjs
var SESSION_TOKEN_PARAM = 'id_token';
function getSessionTokenHeader(request2) {
  return request2.headers.get('authorization')?.replace('Bearer ', '');
}
function getSessionTokenFromUrlParam(request2) {
  const url = new URL(request2.url);
  return url.searchParams.get(SESSION_TOKEN_PARAM);
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/helpers/reject-bot-request.mjs
var SHOPIFY_POS_USER_AGENT = /Shopify POS\//;
var SHOPIFY_MOBILE_USER_AGENT = /Shopify Mobile\//;
var SHOPIFY_USER_AGENTS = [SHOPIFY_POS_USER_AGENT, SHOPIFY_MOBILE_USER_AGENT];
function respondToBotRequest({ logger: logger2 }, request2) {
  const userAgent = request2.headers.get('User-Agent') ?? '';
  if (SHOPIFY_USER_AGENTS.some((agent) => agent.test(userAgent))) {
    logger2.debug('Request is from a Shopify agent, allow');
    return;
  }
  if (isbot(userAgent)) {
    logger2.debug('Request is from a bot, skipping auth');
    throw new Response(void 0, { status: 410, statusText: 'Gone' });
  }
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/helpers/respond-to-options-request.mjs
function respondToOptionsRequest(params, request2, corsHeaders) {
  if (request2.method === 'OPTIONS') {
    const ensureCORSHeaders = ensureCORSHeadersFactory(
      params,
      request2,
      corsHeaders
    );
    throw ensureCORSHeaders(
      new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Max-Age': '7200',
        },
      })
    );
  }
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/authenticate.mjs
import '@remix-run/server-runtime';

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/billing/cancel.mjs
import '@remix-run/server-runtime';

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/helpers/begin-auth.mjs
async function beginAuth(params, request2, isOnline, shop) {
  const { api, config } = params;
  throw await api.auth.begin({
    shop,
    callbackPath: config.auth.callbackPath,
    isOnline,
    rawRequest: request2,
  });
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/helpers/redirect-with-exitiframe.mjs
import { redirect as redirect2 } from '@remix-run/server-runtime';
function redirectWithExitIframe(params, request2, shop) {
  const { api, config } = params;
  const url = new URL(request2.url);
  const queryParams = url.searchParams;
  const host = api.utils.sanitizeHost(queryParams.get('host'));
  queryParams.set('shop', shop);
  let destination = `${config.auth.path}?shop=${shop}`;
  if (host) {
    queryParams.set('host', host);
    destination = `${destination}&host=${host}`;
  }
  queryParams.set('exitIframe', destination);
  throw redirect2(`${config.auth.exitIframePath}?${queryParams.toString()}`);
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/helpers/redirect-with-app-bridge-headers.mjs
function redirectWithAppBridgeHeaders(redirectUri) {
  throw new Response(void 0, {
    status: 401,
    statusText: 'Unauthorized',
    headers: getAppBridgeHeaders(redirectUri),
  });
}
function getAppBridgeHeaders(url) {
  return new Headers({ [REAUTH_URL_HEADER]: url });
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/helpers/redirect-to-auth-page.mjs
async function redirectToAuthPage(params, request2, shop, isOnline = false) {
  const { config } = params;
  const url = new URL(request2.url);
  const isEmbeddedRequest2 = url.searchParams.get('embedded') === '1';
  const isXhrRequest = request2.headers.get('authorization');
  if (isXhrRequest) {
    const redirectUri = new URL(config.auth.path, config.appUrl);
    redirectUri.searchParams.set('shop', shop);
    redirectWithAppBridgeHeaders(redirectUri.toString());
  } else if (isEmbeddedRequest2) {
    redirectWithExitIframe(params, request2, shop);
  } else {
    throw await beginAuth(params, request2, isOnline, shop);
  }
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/helpers/invalidate-access-token.mjs
async function invalidateAccessToken(params, session) {
  const { logger: logger2, config } = params;
  logger2.debug(`Invalidating access token for session - ${session.id}`, {
    shop: session.shop,
  });
  session.accessToken = void 0;
  await config.sessionStorage.storeSession(session);
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/billing/cancel.mjs
function cancelBillingFactory(params, request2, session) {
  return async function cancelBilling(options) {
    const { api, logger: logger2 } = params;
    logger2.debug('Cancelling billing', { shop: session.shop, ...options });
    try {
      return await api.billing.cancel({
        session,
        subscriptionId: options.subscriptionId,
        isTest: options.isTest,
        prorate: options.prorate,
      });
    } catch (error) {
      if (error instanceof HttpResponseError && error.response.code === 401) {
        logger2.debug('API token was invalid, redirecting to OAuth', {
          shop: session.shop,
        });
        await invalidateAccessToken(params, session);
        throw await redirectToAuthPage(params, request2, session.shop);
      } else {
        throw error;
      }
    }
  };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/billing/require.mjs
import '@remix-run/server-runtime';
function requireBillingFactory(params, request2, session) {
  const { api, logger: logger2 } = params;
  return async function requireBilling(options) {
    const logContext = {
      shop: session.shop,
      plans: options.plans,
      isTest: options.isTest,
    };
    logger2.debug('Checking billing for the shop', logContext);
    let data;
    try {
      data = await api.billing.check({
        session,
        plans: options.plans,
        isTest: options.isTest,
        returnObject: true,
      });
    } catch (error) {
      if (error instanceof HttpResponseError && error.response.code === 401) {
        logger2.debug(
          'API token was invalid, redirecting to OAuth',
          logContext
        );
        await invalidateAccessToken(params, session);
        throw await redirectToAuthPage(params, request2, session.shop);
      } else {
        throw error;
      }
    }
    if (!data.hasActivePayment) {
      logger2.debug('Billing check failed', logContext);
      throw await options.onFailure(new Error('Billing check failed'));
    }
    logger2.debug('Billing check succeeded', logContext);
    return data;
  };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/billing/request.mjs
import '@remix-run/server-runtime';

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/billing/helpers.mjs
import { redirect as redirect3 } from '@remix-run/server-runtime';
function redirectOutOfApp(params, request2, url, shop) {
  const { config, logger: logger2 } = params;
  logger2.debug('Redirecting out of app', { shop, url });
  const requestUrl = new URL(request2.url);
  const isEmbeddedRequest2 = requestUrl.searchParams.get('embedded') === '1';
  const isXhrRequest = request2.headers.get('authorization');
  if (isXhrRequest) {
    throw new Response(void 0, {
      status: 401,
      statusText: 'Unauthorized',
      headers: getAppBridgeHeaders(url),
    });
  } else if (isEmbeddedRequest2) {
    const params2 = new URLSearchParams({
      shop,
      host: requestUrl.searchParams.get('host'),
      exitIframe: url,
    });
    throw redirect3(`${config.auth.exitIframePath}?${params2.toString()}`);
  } else {
    throw redirect3(url);
  }
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/billing/request.mjs
function requestBillingFactory(params, request2, session) {
  return async function requestBilling({
    plan,
    isTest,
    returnUrl,
    ...overrides
  }) {
    const { api, logger: logger2 } = params;
    logger2.info('Requesting billing', {
      shop: session.shop,
      plan,
      isTest,
      returnUrl,
    });
    let result;
    try {
      result = await api.billing.request({
        plan,
        session,
        isTest,
        returnUrl,
        returnObject: true,
        ...overrides,
      });
    } catch (error) {
      if (error instanceof HttpResponseError && error.response.code === 401) {
        logger2.debug('API token was invalid, redirecting to OAuth', {
          shop: session.shop,
        });
        await invalidateAccessToken(params, session);
        throw await redirectToAuthPage(params, request2, session.shop);
      } else {
        throw error;
      }
    }
    throw redirectOutOfApp(
      params,
      request2,
      result.confirmationUrl,
      session.shop
    );
  };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/billing/check.mjs
import '@remix-run/server-runtime';
function checkBillingFactory(params, request2, session) {
  return async function checkBilling(options = {}) {
    const { api, logger: logger2 } = params;
    logger2.debug('Checking billing plans', { shop: session.shop, ...options });
    try {
      return await api.billing.check({
        session,
        plans: options.plans,
        isTest: options.isTest,
        returnObject: true,
      });
    } catch (error) {
      if (error instanceof HttpResponseError && error.response.code === 401) {
        logger2.debug('API token was invalid, redirecting to OAuth', {
          shop: session.shop,
        });
        await invalidateAccessToken(params, session);
        throw await redirectToAuthPage(params, request2, session.shop);
      } else {
        throw error;
      }
    }
  };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/billing/create-usage-record.mjs
import '@remix-run/server-runtime';
function createUsageRecordFactory(params, request2, session) {
  return async function createUsageRecord2(options) {
    const { api, logger: logger2 } = params;
    logger2.debug('Create usage record', { shop: session.shop, ...options });
    try {
      return await api.billing.createUsageRecord({
        ...options,
        session,
      });
    } catch (error) {
      if (error instanceof HttpResponseError && error.response.code === 401) {
        logger2.debug('API token was invalid, redirecting to OAuth', {
          shop: session.shop,
        });
        await invalidateAccessToken(params, session);
        throw await redirectToAuthPage(params, request2, session.shop);
      } else {
        throw error;
      }
    }
  };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/billing/update-usage-subscription-capped-amount.mjs
import '@remix-run/server-runtime';
function updateUsageCappedAmountFactory(params, request2, session) {
  return async function updateUsageCappedAmount2(options) {
    const { api, logger: logger2 } = params;
    logger2.debug('Updating usage subscription capped amount', {
      shop: session.shop,
      ...options,
    });
    let result;
    try {
      result = await api.billing.updateUsageCappedAmount({
        session,
        subscriptionLineItemId: options.subscriptionLineItemId,
        cappedAmount: options.cappedAmount,
      });
    } catch (error) {
      if (error instanceof HttpResponseError && error.response.code === 401) {
        logger2.debug('API token was invalid, redirecting to OAuth', {
          shop: session.shop,
        });
        await invalidateAccessToken(params, session);
        throw await redirectToAuthPage(params, request2, session.shop);
      } else {
        throw error;
      }
    }
    throw redirectOutOfApp(
      params,
      request2,
      result.confirmationUrl,
      session.shop
    );
  };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/clients/admin/graphql.mjs
function graphqlClientFactory({ params, handleClientError, session }) {
  return async function query(operation, options) {
    const client = new params.api.clients.Graphql({
      session,
      apiVersion: options?.apiVersion,
    });
    try {
      const apiResponse = await client.request(operation, {
        variables: options?.variables,
        retries: options?.tries ? options.tries - 1 : 0,
        headers: options?.headers,
        signal: options?.signal,
      });
      return new Response(JSON.stringify(apiResponse));
    } catch (error) {
      if (handleClientError) {
        throw await handleClientError({ error, params, session });
      }
      throw error;
    }
  };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/clients/admin/rest.mjs
function restClientFactory({ params, handleClientError, session }) {
  const { api } = params;
  const client = new RemixRestClient({
    params,
    handleClientError,
    session,
  });
  if (api.rest) {
    client.resources = {};
    const RestResourceClient = restResourceClientFactory({
      params,
      handleClientError,
      session,
    });
    Object.entries(api.rest).forEach(([name, resource]) => {
      class RemixResource extends resource {
        static Client = RestResourceClient;
      }
      Reflect.defineProperty(RemixResource, 'name', {
        value: name,
      });
      Reflect.set(client.resources, name, RemixResource);
    });
  }
  return client;
}
var RemixRestClient = class {
  session;
  params;
  handleClientError;
  constructor({ params, session, handleClientError }) {
    this.params = params;
    this.handleClientError = handleClientError;
    this.session = session;
  }
  /**
   * Performs a GET request on the given path.
   *
   * @deprecated In a future major release REST will be removed from this package. Please see [all-in on graphql](https://www.shopify.com/ca/partners/blog/all-in-on-graphql).
   */
  async get(params) {
    return this.makeRequest({
      method: 'GET',
      ...params,
    });
  }
  /**
   * Performs a POST request on the given path.
   *
   * @deprecated In a future major release REST will be removed from this package. Please see [all-in on graphql](https://www.shopify.com/ca/partners/blog/all-in-on-graphql).
   */
  async post(params) {
    return this.makeRequest({
      method: 'POST',
      ...params,
    });
  }
  /**
   * Performs a PUT request on the given path.
   *
   * @deprecated In a future major release REST will be removed from this package. Please see [all-in on graphql](https://www.shopify.com/ca/partners/blog/all-in-on-graphql).
   */
  async put(params) {
    return this.makeRequest({
      method: 'PUT',
      ...params,
    });
  }
  /**
   * Performs a DELETE request on the given path.
   *
   * @deprecated In a future major release REST will be removed from this package. Please see [all-in on graphql](https://www.shopify.com/ca/partners/blog/all-in-on-graphql).
   */
  async delete(params) {
    return this.makeRequest({
      method: 'DELETE',
      ...params,
    });
  }
  async makeRequest(params) {
    const originalClient = new this.params.api.clients.Rest({
      session: this.session,
    });
    const originalRequest = Reflect.get(originalClient, 'request');
    try {
      const apiResponse = await originalRequest.call(originalClient, params);
      return new Response(JSON.stringify(apiResponse.body), {
        headers: apiResponse.headers,
      });
    } catch (error) {
      if (this.handleClientError) {
        throw await this.handleClientError({
          error,
          session: this.session,
          params: this.params,
        });
      } else throw new Error(error);
    }
  }
};
function restResourceClientFactory({ params, handleClientError, session }) {
  const { api } = params;
  const ApiClient = api.clients.Rest;
  return class RestResourceClient extends ApiClient {
    async request(requestParams) {
      const originalClient = new api.clients.Rest({ session });
      const originalRequest = Reflect.get(originalClient, 'request');
      try {
        return await originalRequest.call(originalClient, requestParams);
      } catch (error) {
        if (handleClientError) {
          throw await handleClientError({ error, params, session });
        } else throw new Error(error);
      }
    }
  };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/clients/admin/factory.mjs
function adminClientFactory({ params, handleClientError, session }) {
  if (params.config.future.removeRest) {
    return {
      graphql: graphqlClientFactory({ params, session, handleClientError }),
    };
  }
  return {
    rest: restClientFactory({
      params,
      session,
      handleClientError,
    }),
    graphql: graphqlClientFactory({ params, session, handleClientError }),
  };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/helpers/create-admin-api-context.mjs
function createAdminApiContext(session, params, handleClientError) {
  return adminClientFactory({
    session,
    params,
    handleClientError,
  });
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/helpers/redirect-to-shopify-or-app-root.mjs
import { redirect as redirect4 } from '@remix-run/server-runtime';
async function redirectToShopifyOrAppRoot(request2, params, responseHeaders) {
  const { api } = params;
  const url = new URL(request2.url);
  const host = api.utils.sanitizeHost(url.searchParams.get('host'));
  const shop = api.utils.sanitizeShop(url.searchParams.get('shop'));
  const redirectUrl = api.config.isEmbeddedApp
    ? await api.auth.getEmbeddedAppUrl({ rawRequest: request2 })
    : `/?shop=${shop}&host=${encodeURIComponent(host)}`;
  throw redirect4(redirectUrl, { headers: responseHeaders });
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/helpers/ensure-app-is-embedded-if-required.mjs
var ensureAppIsEmbeddedIfRequired = async (params, request2) => {
  const { api, logger: logger2, config } = params;
  const url = new URL(request2.url);
  const shop = url.searchParams.get('shop');
  if (api.config.isEmbeddedApp && url.searchParams.get('embedded') !== '1') {
    logger2.debug('App is not embedded, redirecting to Shopify', { shop });
    await redirectToShopifyOrAppRoot(request2, { api });
  }
};

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/helpers/ensure-session-token-search-param-if-required.mjs
var SESSION_TOKEN_PARAM2 = 'id_token';
var ensureSessionTokenSearchParamIfRequired = async (params, request2) => {
  const { api, logger: logger2 } = params;
  const url = new URL(request2.url);
  const shop = url.searchParams.get('shop');
  const searchParamSessionToken = url.searchParams.get(SESSION_TOKEN_PARAM2);
  const isEmbedded = url.searchParams.get('embedded') === '1';
  if (api.config.isEmbeddedApp && isEmbedded && !searchParamSessionToken) {
    logger2.debug(
      'Missing session token in search params, going to bounce page',
      { shop }
    );
    redirectToBouncePage(params, url);
  }
};

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/helpers/redirect.mjs
import { redirect as redirect5 } from '@remix-run/server-runtime';

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/helpers/add-response-headers.mjs
function addDocumentResponseHeadersFactory(params) {
  const { api, config } = params;
  return function (request2, headers) {
    const { searchParams } = new URL(request2.url);
    const shop = api.utils.sanitizeShop(searchParams.get('shop'));
    addDocumentResponseHeaders(headers, config.isEmbeddedApp, shop);
  };
}
function addDocumentResponseHeaders(headers, isEmbeddedApp, shop) {
  if (shop) {
    headers.set(
      'Link',
      '<https://cdn.shopify.com/shopifycloud/app-bridge.js>; rel="preload"; as="script";'
    );
  }
  if (isEmbeddedApp) {
    if (shop) {
      headers.set(
        'Content-Security-Policy',
        `frame-ancestors https://${shop} https://admin.shopify.com https://*.spin.dev https://admin.myshopify.io https://admin.shop.dev;`
      );
    }
  } else {
    headers.set('Content-Security-Policy', `frame-ancestors 'none';`);
  }
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/helpers/validate-redirect-url.mjs
var FILE_URI_MATCH = /\/\/\//;
var INVALID_RELATIVE_URL = /[/\\][/\\]/;
var WHITESPACE_CHARACTER = /\s/;
var VALID_PROTOCOLS = ['https:', 'http:'];
function isSafe(domain, redirectUrl, requireSSL = true) {
  if (typeof redirectUrl !== 'string') {
    return false;
  }
  if (
    FILE_URI_MATCH.test(redirectUrl) ||
    WHITESPACE_CHARACTER.test(redirectUrl)
  ) {
    return false;
  }
  let url;
  try {
    url = new URL(redirectUrl, domain);
  } catch (error) {
    return false;
  }
  if (INVALID_RELATIVE_URL.test(url.pathname)) {
    return false;
  }
  if (!VALID_PROTOCOLS.includes(url.protocol)) {
    return false;
  }
  if (requireSSL && url.protocol !== 'https:') {
    return false;
  }
  return true;
}
function sanitizeRedirectUrl(domain, redirectUrl, options = {}) {
  if (isSafe(domain, redirectUrl, options.requireSSL)) {
    return new URL(redirectUrl, domain);
  } else if (options.throwOnInvalid === false) {
    return void 0;
  } else {
    throw new ShopifyError('Invalid URL. Refusing to redirect');
  }
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/helpers/render-app-bridge.mjs
function renderAppBridge({ config }, request2, redirectTo) {
  let redirectToScript = '';
  if (redirectTo) {
    const destination = sanitizeRedirectUrl(config.appUrl, redirectTo.url);
    const target = redirectTo.target ?? '_top';
    redirectToScript = `<script>window.open(${JSON.stringify(destination.toString())}, ${JSON.stringify(target)})</script>`;
  }
  const responseHeaders = new Headers({
    'content-type': 'text/html;charset=utf-8',
  });
  addDocumentResponseHeaders(
    responseHeaders,
    config.isEmbeddedApp,
    new URL(request2.url).searchParams.get('shop')
  );
  throw new Response(
    `
      <script data-api-key="${config.apiKey}" src="${appBridgeUrl()}"></script>
      ${redirectToScript}
    `,
    { headers: responseHeaders }
  );
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/helpers/redirect.mjs
function redirectFactory(params, request2, shop) {
  const { config, logger: logger2 } = params;
  return function redirect$1(url, init) {
    const { searchParams } = new URL(request2.url);
    const { url: parsedUrl, target } = parseURL({
      params,
      url,
      base: config.appUrl,
      shop,
      init,
    });
    logger2.debug('Redirecting', { shop, url: parsedUrl.toString() });
    const isSameOrigin = parsedUrl.origin === config.appUrl;
    if (isSameOrigin || url.startsWith('/')) {
      searchParams.forEach((value, key) => {
        if (!parsedUrl.searchParams.has(key)) {
          parsedUrl.searchParams.set(key, value);
        }
      });
    }
    if (target === '_self') {
      if (isBounceRequest(request2)) {
        throw renderAppBridge(params, request2, {
          url: parsedUrl.toString(),
          target,
        });
      } else {
        return redirect5(parsedUrl.toString(), init);
      }
    } else if (isDataRequest(request2)) {
      throw redirectWithAppBridgeHeaders(parsedUrl.toString());
    } else if (isEmbeddedRequest(request2)) {
      throw renderAppBridge(params, request2, {
        url: parsedUrl.toString(),
        target,
      });
    }
    return redirect5(url, init);
  };
}
function isBounceRequest(request2) {
  return (
    Boolean(getSessionTokenHeader(request2)) &&
    request2.headers.has('X-Shopify-Bounce')
  );
}
function isDataRequest(request2) {
  const isGet = request2.method === 'GET';
  const sessionTokenHeader = Boolean(getSessionTokenHeader(request2));
  return (
    sessionTokenHeader &&
    !isBounceRequest(request2) &&
    (!isEmbeddedRequest(request2) || !isGet)
  );
}
function isEmbeddedRequest(request2) {
  const { searchParams } = new URL(request2.url);
  return searchParams.get('embedded') === '1';
}
function parseURL({ params, base, init, shop, url }) {
  let target = typeof init !== 'number' && init?.target ? init.target : void 0;
  if (isAdminRemotePath(url)) {
    const { config } = params;
    const adminPath = getAdminRemotePath(url);
    const cleanShopName = shop.replace('.myshopify.com', '');
    if (!target) {
      target = config.isEmbeddedApp ? '_parent' : '_self';
    }
    return {
      url: new URL(
        `https://admin.shopify.com/store/${cleanShopName}${adminPath}`
      ),
      target,
    };
  } else {
    return {
      url: new URL(url, base),
      target: target ?? '_self',
    };
  }
}
var ADMIN_REGEX = /^shopify:\/*admin\//i;
function isAdminRemotePath(url) {
  return ADMIN_REGEX.test(url);
}
function getAdminRemotePath(url) {
  const parsedUrl = removeRestrictedParams(new URL(url)).href;
  return parsedUrl.replace(ADMIN_REGEX, '/');
}
var embeddedFrameParamsToRemove = [
  'hmac',
  'locale',
  'protocol',
  'session',
  'id_token',
  'shop',
  'timestamp',
  'host',
  'embedded',
  // sent when clicking rel="home" nav item
  'appLoadId',
];
function removeRestrictedParams(url) {
  const newUrl = new URL(url);
  embeddedFrameParamsToRemove.forEach((param) =>
    newUrl.searchParams.delete(param)
  );
  return newUrl;
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/helpers/validate-shop-and-host-params.mjs
import { redirect as redirect6 } from '@remix-run/server-runtime';
function validateShopAndHostParams(params, request2) {
  const { api, config, logger: logger2 } = params;
  if (config.isEmbeddedApp) {
    const url = new URL(request2.url);
    const shop = api.utils.sanitizeShop(url.searchParams.get('shop'));
    if (!shop) {
      logger2.debug('Missing or invalid shop, redirecting to login path', {
        shop,
      });
      throw redirectToLoginPath(request2, params);
    }
    const host = api.utils.sanitizeHost(url.searchParams.get('host'));
    if (!host) {
      logger2.debug('Invalid host, redirecting to login path', {
        shop,
        host: url.searchParams.get('host'),
      });
      throw redirectToLoginPath(request2, params);
    }
  }
}
function redirectToLoginPath(request2, params) {
  const { config, logger: logger2 } = params;
  const { pathname } = new URL(request2.url);
  if (pathname === config.auth.loginPath) {
    const message2 = `Detected call to shopify.authenticate.admin() from configured login path ('${config.auth.loginPath}'), please make sure to call shopify.login() from that route instead.`;
    logger2.debug(message2);
    throw new Response(message2, { status: 500 });
  }
  throw redirect6(config.auth.loginPath);
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/helpers/redirect-to-install-page.mjs
import { redirect as redirect7 } from '@remix-run/server-runtime';
async function redirectToInstallPage(params, shop, optionalScopes = []) {
  const installUrl = buildInstallUrl(params, shop, optionalScopes);
  if (params.config.isEmbeddedApp) {
    throw redirectWithAppBridgeHeaders(installUrl);
  } else {
    throw redirect7(installUrl);
  }
}
function buildInstallUrl(params, shop, optionalScopes = []) {
  const baseInstallUrl = buildBaseInstallUrl(params, shop);
  baseInstallUrl.search = buildParamsInstallUrl(
    params,
    optionalScopes
  ).toString();
  return baseInstallUrl.href;
}
function buildBaseInstallUrl({ api }, shop) {
  const cleanShop = api.utils.sanitizeShop(shop, true);
  return new URL(`https://${cleanShop}/admin/oauth/install`);
}
function buildParamsInstallUrl({ config }, optionalScopes = []) {
  const optionalScopesParam =
    optionalScopes && optionalScopes.length > 0
      ? { optional_scopes: optionalScopes.join(',') }
      : void 0;
  const query = {
    client_id: config.apiKey,
    scope: config.scopes?.toString() || '',
    ...optionalScopesParam,
  };
  return new URLSearchParams(query);
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/scope/client/fetch-scopes-details.mjs
var FETCH_SCOPES_DETAIL_QUERY = `#graphql
query FetchAccessScopes{
  app {
    requestedAccessScopes {
      handle
    }
    optionalAccessScopes {
      handle
    }
    installation {
      accessScopes {
        handle
      }
    }
  }
}`;
async function fetchScopeDetail(admin) {
  const fetchScopeDetailResult = await admin.graphql(FETCH_SCOPES_DETAIL_QUERY);
  const resultContent = await fetchScopeDetailResult.json();
  return resultContent.data;
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/scope/request.mjs
function requestScopesFactory(params, session, admin) {
  return async function requestScopes(scopes) {
    const { logger: logger2 } = params;
    logger2.debug('Requesting optional scopes: ', {
      shop: session.shop,
      scopes,
    });
    if (scopes.length === 0) return;
    if (await alreadyGranted(scopes, admin)) return;
    throw await redirectToInstallPage(params, session.shop, scopes);
  };
  async function alreadyGranted(scopes, admin2) {
    const scopesDetail = await fetchScopeDetail(admin2);
    const grantedScopes = scopesDetail.app.installation.accessScopes.map(
      (scope) => scope.handle
    );
    return new AuthScopes(grantedScopes).has(scopes);
  }
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/scope/query.mjs
function queryScopesFactory(params, session, admin) {
  return async function queryScopes() {
    const { logger: logger2 } = params;
    logger2.debug('Querying scopes details: ', {
      shop: session.shop,
    });
    const scopesDetail = await fetchScopeDetail(admin);
    return mapFetchScopeDetail(scopesDetail);
  };
}
function mapFetchScopeDetail(scopesDetailResponse) {
  const appInformation = scopesDetailResponse.app;
  const granted = new AuthScopes(
    appInformation.installation.accessScopes.map((scope) => scope.handle)
  ).toArray(true);
  const required = new AuthScopes(
    appInformation.requestedAccessScopes.map((scope) => scope.handle)
  ).toArray(true);
  const optional = new AuthScopes(
    appInformation.optionalAccessScopes.map((scope) => scope.handle)
  ).toArray(true);
  return {
    granted,
    required,
    optional,
  };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/scope/client/revoke-scopes.mjs
var REVOKE_SCOPE_MUTATION = `#graphql
mutation AppRevokeAccessScopes($scopes: [String!]!) {
  appRevokeAccessScopes(scopes: $scopes){
    revoked {
      handle
    }
    userErrors {
      field
      message
    }
  }
}`;
async function revokeScopes(admin, scopes) {
  const revokeScopesResult = await admin.graphql(REVOKE_SCOPE_MUTATION, {
    variables: {
      scopes,
    },
  });
  const resultContent = await revokeScopesResult.json();
  return resultContent.data.appRevokeAccessScopes;
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/scope/revoke.mjs
function revokeScopesFactory(params, session, admin) {
  return async function revoke(scopes) {
    const { logger: logger2 } = params;
    await validateScopes(scopes);
    logger2.debug('Revoke scopes: ', {
      shop: session.shop,
      scopes,
    });
    const revokeScopesResult = await revokeScopes(admin, scopes);
    if (revokeScopesResult.userErrors?.length > 0) {
      logger2.error('Failed to revoke scopes: ', {
        shop: session.shop,
        errors: revokeScopesResult.userErrors,
      });
      throw new Response(JSON.stringify(revokeScopesResult.userErrors), {
        status: 422,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    return {
      revoked: revokeScopesResult.revoked.map((scope) => scope.handle),
    };
  };
}
async function validateScopes(scopes) {
  if (!scopes || scopes.length === 0) {
    throw new Response('No scopes provided', { status: 400 });
  }
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/scope/factory.mjs
function scopesApiFactory(params, session, admin) {
  return {
    query: queryScopesFactory(params, session, admin),
    request: requestScopesFactory(params, session, admin),
    revoke: revokeScopesFactory(params, session, admin),
  };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/authenticate.mjs
function authStrategyFactory({ strategy, ...params }) {
  const { api, logger: logger2, config } = params;
  async function respondToBouncePageRequest(request2) {
    const url = new URL(request2.url);
    if (url.pathname === config.auth.patchSessionTokenPath) {
      logger2.debug('Rendering bounce page', {
        shop: getShopFromRequest(request2),
      });
      throw renderAppBridge({ config }, request2);
    }
  }
  async function respondToExitIframeRequest(request2) {
    const url = new URL(request2.url);
    if (url.pathname === config.auth.exitIframePath) {
      const destination = url.searchParams.get('exitIframe');
      logger2.debug('Rendering exit iframe page', {
        shop: getShopFromRequest(request2),
        destination,
      });
      throw renderAppBridge({ config }, request2, { url: destination });
    }
  }
  function createContext(request2, session, authStrategy, sessionToken) {
    let context = {
      admin: createAdminApiContext(
        session,
        params,
        authStrategy.handleClientError(request2)
      ),
      billing: {
        require: requireBillingFactory(params, request2, session),
        check: checkBillingFactory(params, request2, session),
        request: requestBillingFactory(params, request2, session),
        cancel: cancelBillingFactory(params, request2, session),
        createUsageRecord: createUsageRecordFactory(params, request2, session),
        updateUsageCappedAmount: updateUsageCappedAmountFactory(
          params,
          request2,
          session
        ),
      },
      session,
      cors: ensureCORSHeadersFactory(params, request2),
    };
    context = addEmbeddedFeatures(context, request2, session, sessionToken);
    context = addScopesFeatures(context);
    return context;
  }
  function addEmbeddedFeatures(context, request2, session, sessionToken) {
    if (config.isEmbeddedApp) {
      return {
        ...context,
        sessionToken,
        redirect: redirectFactory(params, request2, session.shop),
      };
    }
    return context;
  }
  function addScopesFeatures(context) {
    return {
      ...context,
      scopes: scopesApiFactory(params, context.session, context.admin),
    };
  }
  return async function authenticateAdmin(request2) {
    try {
      respondToBotRequest(params, request2);
      respondToOptionsRequest(params, request2);
      await respondToBouncePageRequest(request2);
      await respondToExitIframeRequest(request2);
      await strategy.respondToOAuthRequests(request2);
      if (!getSessionTokenHeader(request2)) {
        validateShopAndHostParams(params, request2);
        await ensureAppIsEmbeddedIfRequired(params, request2);
        await ensureSessionTokenSearchParamIfRequired(params, request2);
      }
      logger2.info('Authenticating admin request', {
        shop: getShopFromRequest(request2),
      });
      const { payload, shop, sessionId, sessionToken } =
        await getSessionTokenContext(params, request2);
      logger2.debug('Loading session from storage', { shop, sessionId });
      const existingSession = sessionId
        ? await config.sessionStorage.loadSession(sessionId)
        : void 0;
      const session = await strategy.authenticate(request2, {
        session: existingSession,
        sessionToken,
        shop,
      });
      return createContext(request2, session, strategy, payload);
    } catch (errorOrResponse) {
      if (errorOrResponse instanceof Response) {
        logger2.debug('Authenticate returned a response', {
          shop: getShopFromRequest(request2),
        });
        ensureCORSHeadersFactory(params, request2)(errorOrResponse);
      }
      throw errorOrResponse;
    }
  };
}
async function getSessionTokenContext(params, request2) {
  const { api, config, logger: logger2 } = params;
  const headerSessionToken = getSessionTokenHeader(request2);
  const searchParamSessionToken = getSessionTokenFromUrlParam(request2);
  const sessionToken = headerSessionToken || searchParamSessionToken;
  logger2.debug('Attempting to authenticate session token', {
    shop: getShopFromRequest(request2),
    sessionToken: JSON.stringify({
      header: headerSessionToken,
      search: searchParamSessionToken,
    }),
  });
  if (config.isEmbeddedApp) {
    const payload = await validateSessionToken(params, request2, sessionToken);
    const dest = new URL(payload.dest);
    const shop2 = dest.hostname;
    logger2.debug('Session token is valid - authenticated', {
      shop: shop2,
      payload,
    });
    const sessionId2 = config.useOnlineTokens
      ? api.session.getJwtSessionId(shop2, payload.sub)
      : api.session.getOfflineId(shop2);
    return { shop: shop2, payload, sessionId: sessionId2, sessionToken };
  }
  const url = new URL(request2.url);
  const shop = url.searchParams.get('shop');
  const sessionId = await api.session.getCurrentId({
    isOnline: config.useOnlineTokens,
    rawRequest: request2,
  });
  return { shop, sessionId, payload: void 0, sessionToken };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/webhooks/authenticate.mjs
import '@remix-run/server-runtime';

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/helpers/handle-client-error.mjs
function handleClientErrorFactory({ request: request2, onError }) {
  return async function handleClientError({ error, params, session }) {
    if (error instanceof HttpResponseError !== true) {
      params.logger.debug(
        `Got a response error from the API: ${error.message}`,
        { shop: session.shop }
      );
      throw error;
    }
    params.logger.debug(
      `Got an HTTP response error from the API: ${error.message}`,
      {
        shop: session.shop,
        code: error.response.code,
        statusText: error.response.statusText,
        body: JSON.stringify(error.response.body),
      }
    );
    if (onError) {
      await onError({ request: request2, session, error });
    }
    throw new Response(JSON.stringify(error.response.body), {
      status: error.response.code,
      headers: {
        'Content-Type': error.response.headers['Content-Type'],
      },
    });
  };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/helpers/create-or-load-offline-session.mjs
async function createOrLoadOfflineSession(
  shop,
  { api, config, logger: logger2 }
) {
  if (config.distribution === AppDistribution.ShopifyAdmin) {
    logger2.debug('Creating custom app session from configured access token', {
      shop,
    });
    return api.session.customAppSession(shop);
  } else {
    logger2.debug('Loading offline session from session storage', { shop });
    const offlineSessionId = api.session.getOfflineId(shop);
    const session = await config.sessionStorage.loadSession(offlineSessionId);
    return session;
  }
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/webhooks/authenticate.mjs
function authenticateWebhookFactory(params) {
  const { api, logger: logger2 } = params;
  return async function authenticate2(request2) {
    if (request2.method !== 'POST') {
      logger2.debug(
        'Received a non-POST request for a webhook. Only POST requests are allowed.',
        { url: request2.url, method: request2.method }
      );
      throw new Response(void 0, {
        status: 405,
        statusText: 'Method not allowed',
      });
    }
    const rawBody = await request2.text();
    const check2 = await api.webhooks.validate({
      rawBody,
      rawRequest: request2,
    });
    if (!check2.valid) {
      if (check2.reason === WebhookValidationErrorReason.InvalidHmac) {
        logger2.debug('Webhook HMAC validation failed', check2);
        throw new Response(void 0, {
          status: 401,
          statusText: 'Unauthorized',
        });
      } else {
        logger2.debug('Webhook validation failed', check2);
        throw new Response(void 0, { status: 400, statusText: 'Bad Request' });
      }
    }
    const session = await createOrLoadOfflineSession(check2.domain, params);
    const webhookContext = {
      apiVersion: check2.apiVersion,
      shop: check2.domain,
      topic: check2.topic,
      webhookId: check2.webhookId,
      payload: JSON.parse(rawBody),
      subTopic: check2.subTopic || void 0,
      session: void 0,
      admin: void 0,
    };
    if (!session) {
      return webhookContext;
    }
    const admin = adminClientFactory({
      params,
      session,
      handleClientError: handleClientErrorFactory({ request: request2 }),
    });
    return {
      ...webhookContext,
      session,
      admin,
    };
  };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/override-logger.mjs
var import_semver = __toESM(require_semver2(), 1);
function overrideLogger(logger2) {
  const baseContext = { package: 'shopify-app' };
  const warningFunction = (message2, context = {}) =>
    logger2.warning(message2, { ...baseContext, ...context });
  function deprecated2(warningFunction2) {
    return function (version, message2) {
      if (import_semver.default.gte(SHOPIFY_REMIX_LIBRARY_VERSION, version)) {
        throw new FeatureDeprecatedError(
          `Feature was deprecated in version ${version}`
        );
      }
      return warningFunction2(`[Deprecated | ${version}] ${message2}`);
    };
  }
  return {
    ...logger2,
    log: (severity, message2, context = {}) =>
      logger2.log(severity, message2, { ...baseContext, ...context }),
    debug: (message2, context = {}) =>
      logger2.debug(message2, { ...baseContext, ...context }),
    info: (message2, context = {}) =>
      logger2.info(message2, { ...baseContext, ...context }),
    warning: warningFunction,
    error: (message2, context = {}) =>
      logger2.error(message2, { ...baseContext, ...context }),
    deprecated: deprecated2(warningFunction),
  };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/shopify-app.mjs
import '@remix-run/server-runtime';

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/login/login.mjs
import { redirect as redirect8 } from '@remix-run/server-runtime';
function loginFactory(params) {
  const { api, config, logger: logger2 } = params;
  return async function login2(request2) {
    const url = new URL(request2.url);
    const shopParam = url.searchParams.get('shop');
    if (request2.method === 'GET' && !shopParam) {
      return {};
    }
    const shop = shopParam || (await request2.formData()).get('shop');
    if (!shop) {
      logger2.debug('Missing shop parameter', { shop });
      return { shop: LoginErrorType.MissingShop };
    }
    const shopWithoutProtocol = shop
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');
    const shopWithDomain =
      shop?.indexOf('.') === -1
        ? `${shopWithoutProtocol}.myshopify.com`
        : shopWithoutProtocol;
    const sanitizedShop = api.utils.sanitizeShop(shopWithDomain);
    if (!sanitizedShop) {
      logger2.debug('Invalid shop parameter', { shop });
      return { shop: LoginErrorType.InvalidShop };
    }
    const authPath = `${config.appUrl}${config.auth.path}?shop=${sanitizedShop}`;
    const adminPath = api.utils.legacyUrlToShopAdminUrl(sanitizedShop);
    const installPath = `https://${adminPath}/oauth/install?client_id=${config.apiKey}`;
    const shouldInstall =
      config.isEmbeddedApp && config.future.unstable_newEmbeddedAuthStrategy;
    const redirectUrl = shouldInstall ? installPath : authPath;
    logger2.info(`Redirecting login request to ${redirectUrl}`, {
      shop: sanitizedShop,
    });
    throw redirect8(redirectUrl);
  };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/errors.mjs
var SessionNotFoundError = class extends ShopifyError {};

// node_modules/@shopify/shopify-app-remix/dist/esm/server/unauthenticated/admin/factory.mjs
function unauthenticatedAdminContextFactory(params) {
  return async (shop) => {
    const session = await createOrLoadOfflineSession(shop, params);
    if (!session) {
      throw new SessionNotFoundError(
        `Could not find a session for shop ${shop} when creating unauthenticated admin context`
      );
    }
    return {
      session,
      admin: adminClientFactory({ params, session }),
    };
  };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/public/extension/authenticate.mjs
import '@remix-run/server-runtime';
function authenticateExtensionFactory(params, requestType) {
  return async function authenticateExtension(request2, options = {}) {
    const { logger: logger2 } = params;
    const corsHeaders = options.corsHeaders ?? [];
    respondToBotRequest(params, request2);
    respondToOptionsRequest(params, request2, corsHeaders);
    const sessionTokenHeader = getSessionTokenHeader(request2);
    logger2.info(`Authenticating ${requestType} request`, {
      shop: getShopFromRequest(request2),
    });
    if (!sessionTokenHeader) {
      logger2.debug('Request did not contain a session token', {
        shop: getShopFromRequest(request2),
      });
      throw new Response(void 0, {
        status: 401,
        statusText: 'Unauthorized',
      });
    }
    return {
      sessionToken: await validateSessionToken(
        params,
        request2,
        sessionTokenHeader,
        { checkAudience: false, retryRequest: false }
      ),
      cors: ensureCORSHeadersFactory(params, request2, corsHeaders),
    };
  };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/public/checkout/authenticate.mjs
function authenticateCheckoutFactory(params) {
  return authenticateExtensionFactory(params, 'checkout');
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/clients/storefront/factory.mjs
function storefrontClientFactory({ params, session }) {
  const { api } = params;
  return {
    graphql: async (query, options = {}) => {
      const client = new api.clients.Storefront({
        session,
        apiVersion: options.apiVersion,
      });
      const apiResponse = await client.request(query, {
        variables: options?.variables,
        retries: options?.tries ? options.tries - 1 : 0,
        headers: options?.headers,
      });
      return new Response(JSON.stringify(apiResponse));
    },
  };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/public/appProxy/authenticate.mjs
function authenticateAppProxyFactory(params) {
  const { api, config, logger: logger2 } = params;
  return async function authenticate2(request2) {
    const url = new URL(request2.url);
    const shop = url.searchParams.get('shop');
    logger2.info('Authenticating app proxy request', { shop });
    if (!(await validateAppProxyHmac(params, url))) {
      logger2.info('App proxy request has invalid signature', { shop });
      throw new Response(void 0, {
        status: 400,
        statusText: 'Bad Request',
      });
    }
    const sessionId = api.session.getOfflineId(shop);
    const session = await config.sessionStorage.loadSession(sessionId);
    if (!session) {
      logger2.debug('Could not find offline session, returning empty context', {
        shop,
        ...Object.fromEntries(url.searchParams.entries()),
      });
      const context2 = {
        liquid,
        session: void 0,
        admin: void 0,
        storefront: void 0,
      };
      return context2;
    }
    const context = {
      liquid,
      session,
      admin: adminClientFactory({ params, session }),
      storefront: storefrontClientFactory({ params, session }),
    };
    return context;
  };
}
var liquid = (body, initAndOptions) => {
  const processedBody = processLiquidBody(body);
  if (typeof initAndOptions !== 'object') {
    return new Response(processedBody, {
      status: initAndOptions || 200,
      headers: {
        'Content-Type': 'application/liquid',
      },
    });
  }
  const { layout, ...responseInit } = initAndOptions || {};
  const responseBody =
    layout === false ? `{% layout none %} ${processedBody}` : processedBody;
  const headers = new Headers(responseInit.headers);
  headers.set('Content-Type', 'application/liquid');
  return new Response(responseBody, {
    ...responseInit,
    headers,
  });
};
async function validateAppProxyHmac(params, url) {
  const { api, logger: logger2 } = params;
  try {
    let searchParams = new URLSearchParams(url.search);
    if (!searchParams.get('index')) {
      searchParams.delete('index');
    }
    let isValid = await api.utils.validateHmac(
      Object.fromEntries(searchParams.entries()),
      { signator: 'appProxy' }
    );
    if (!isValid) {
      const cleanPath = url.pathname
        .replace(/^\//, '')
        .replace(/\/$/, '')
        .replaceAll('/', '.');
      const data = `routes%2F${cleanPath}`;
      searchParams = new URLSearchParams(
        `?_data=${data}&${searchParams.toString().replace(/^\?/, '')}`
      );
      isValid = await api.utils.validateHmac(
        Object.fromEntries(searchParams.entries()),
        { signator: 'appProxy' }
      );
      if (!isValid) {
        const searchParams2 = new URLSearchParams(
          `?_data=${data}._index&${url.search.replace(/^\?/, '')}`
        );
        isValid = await api.utils.validateHmac(
          Object.fromEntries(searchParams2.entries()),
          { signator: 'appProxy' }
        );
      }
    }
    return isValid;
  } catch (error) {
    const shop = url.searchParams.get('shop');
    logger2.info(error.message, { shop });
    throw new Response(void 0, { status: 400, statusText: 'Bad Request' });
  }
}
function processLiquidBody(body) {
  return body
    .replaceAll(
      /<(form[^>]+)action="(\/[^"?]+)(\?[^"]+)?">/g,
      '<$1action="$2/$3">'
    )
    .replaceAll(/<(a[^>]+)href="(\/[^"?]+)(\?[^"]+)?">/g, '<$1href="$2/$3">');
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/public/customer-account/authenticate.mjs
function authenticateCustomerAccountFactory(params) {
  return authenticateExtensionFactory(params, 'customer account');
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/public/pos/authenticate.mjs
function authenticatePOSFactory(params) {
  return authenticateExtensionFactory(params, 'pos');
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/public/factory.mjs
function authenticatePublicFactory(params) {
  const authenticateCheckout = authenticateCheckoutFactory(params);
  const authenticateAppProxy = authenticateAppProxyFactory(params);
  const authenticateCustomerAccount =
    authenticateCustomerAccountFactory(params);
  const authenticatePOS = authenticatePOSFactory(params);
  const context = {
    checkout: authenticateCheckout,
    appProxy: authenticateAppProxy,
    customerAccount: authenticateCustomerAccount,
    pos: authenticatePOS,
  };
  return context;
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/unauthenticated/storefront/factory.mjs
function unauthenticatedStorefrontContextFactory(params) {
  return async (shop) => {
    const session = await createOrLoadOfflineSession(shop, params);
    if (!session) {
      throw new SessionNotFoundError(
        `Could not find a session for shop ${shop} when creating unauthenticated storefront context`
      );
    }
    return {
      session,
      storefront: storefrontClientFactory({ params, session }),
    };
  };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/strategies/auth-code-flow.mjs
import '@remix-run/server-runtime';

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/helpers/trigger-after-auth-hook.mjs
async function triggerAfterAuthHook(params, session, request2, authStrategy) {
  const { config, logger: logger2 } = params;
  if (config.hooks.afterAuth) {
    logger2.info('Running afterAuth hook', { shop: session.shop });
    const admin = createAdminApiContext(
      session,
      params,
      authStrategy.handleClientError(request2)
    );
    await config.hooks.afterAuth({
      session,
      admin,
    });
  }
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/strategies/auth-code-flow.mjs
var AuthCodeFlowStrategy = class {
  api;
  config;
  logger;
  constructor({ api, config, logger: logger2 }) {
    this.api = api;
    this.config = config;
    this.logger = logger2;
  }
  async respondToOAuthRequests(request2) {
    const { api, config } = this;
    const url = new URL(request2.url);
    const isAuthRequest = url.pathname === config.auth.path;
    const isAuthCallbackRequest = url.pathname === config.auth.callbackPath;
    if (isAuthRequest || isAuthCallbackRequest) {
      const shop = api.utils.sanitizeShop(url.searchParams.get('shop'));
      if (!shop) throw new Response('Shop param is invalid', { status: 400 });
      if (isAuthRequest) {
        throw await this.handleAuthBeginRequest(request2, shop);
      } else {
        throw await this.handleAuthCallbackRequest(request2, shop);
      }
    }
    if (!getSessionTokenHeader(request2)) {
      await this.ensureInstalledOnShop(request2);
    }
  }
  async authenticate(request2, sessionContext) {
    const { api, config, logger: logger2 } = this;
    const { shop, session } = sessionContext;
    if (!session) {
      logger2.debug('No session found, redirecting to OAuth', { shop });
      await redirectToAuthPage({ config, api }, request2, shop);
    } else if (!session.isActive(config.scopes)) {
      logger2.debug(
        'Found a session, but it has expired, redirecting to OAuth',
        { shop }
      );
      await redirectToAuthPage({ config, api }, request2, shop);
    }
    logger2.debug('Found a valid session', { shop });
    return session;
  }
  handleClientError(request2) {
    const { api, config, logger: logger2 } = this;
    return handleClientErrorFactory({
      request: request2,
      onError: async ({ session, error }) => {
        if (error.response.code === 401) {
          throw await redirectToAuthPage(
            { api, config },
            request2,
            session.shop
          );
        }
      },
    });
  }
  async ensureInstalledOnShop(request2) {
    const { api, config, logger: logger2 } = this;
    validateShopAndHostParams({ api, config, logger: logger2 }, request2);
    const url = new URL(request2.url);
    let shop = url.searchParams.get('shop');
    logger2.debug('Ensuring app is installed on shop', { shop });
    if (!(await this.hasValidOfflineId(request2))) {
      logger2.info("Could not find a shop, can't authenticate request");
      throw new Response(void 0, {
        status: 400,
        statusText: 'Bad Request',
      });
    }
    const offlineSession = await this.getOfflineSession(request2);
    const isEmbedded = url.searchParams.get('embedded') === '1';
    if (!offlineSession) {
      logger2.info("Shop hasn't installed app yet, redirecting to OAuth", {
        shop,
      });
      if (isEmbedded) {
        redirectWithExitIframe({ api, config }, request2, shop);
      } else {
        throw await beginAuth({ api, config }, request2, false, shop);
      }
    }
    shop = shop || offlineSession.shop;
    if (config.isEmbeddedApp && !isEmbedded) {
      try {
        logger2.debug('Ensuring offline session is valid before embedding', {
          shop,
        });
        await this.testSession(offlineSession);
        logger2.debug('Offline session is still valid, embedding app', {
          shop,
        });
      } catch (error) {
        await this.handleInvalidOfflineSession(error, request2, shop);
      }
    }
  }
  async handleAuthBeginRequest(request2, shop) {
    const { api, config, logger: logger2 } = this;
    logger2.info('Handling OAuth begin request', { shop });
    if (
      config.isEmbeddedApp &&
      request2.headers.get('Sec-Fetch-Dest') === 'iframe'
    ) {
      logger2.debug('Auth request in iframe detected, exiting iframe', {
        shop,
      });
      throw redirectWithExitIframe({ api, config }, request2, shop);
    } else {
      throw await beginAuth({ api, config }, request2, false, shop);
    }
  }
  async handleAuthCallbackRequest(request2, shop) {
    const { api, config, logger: logger2 } = this;
    logger2.info('Handling OAuth callback request', { shop });
    try {
      const { session, headers: responseHeaders } = await api.auth.callback({
        rawRequest: request2,
      });
      await config.sessionStorage.storeSession(session);
      if (config.useOnlineTokens && !session.isOnline) {
        logger2.info('Requesting online access token for offline session', {
          shop,
        });
        await beginAuth({ api, config, logger: logger2 }, request2, true, shop);
      }
      logger2.debug('Request is valid, loaded session from OAuth callback', {
        shop: session.shop,
        isOnline: session.isOnline,
      });
      await triggerAfterAuthHook(
        { api, config, logger: logger2 },
        session,
        request2,
        this
      );
      throw await redirectToShopifyOrAppRoot(
        request2,
        { api, config, logger: logger2 },
        responseHeaders
      );
    } catch (error) {
      if (error instanceof Response) throw error;
      throw await this.oauthCallbackError(error, request2, shop);
    }
  }
  async getOfflineSession(request2) {
    const offlineId = await this.getOfflineSessionId(request2);
    return this.config.sessionStorage.loadSession(offlineId);
  }
  async hasValidOfflineId(request2) {
    return Boolean(await this.getOfflineSessionId(request2));
  }
  async getOfflineSessionId(request2) {
    const { api } = this;
    const url = new URL(request2.url);
    const shop = url.searchParams.get('shop');
    return shop
      ? api.session.getOfflineId(shop)
      : api.session.getCurrentId({ isOnline: false, rawRequest: request2 });
  }
  async testSession(session) {
    const { api } = this;
    const client = new api.clients.Graphql({
      session,
    });
    await client.request(`#graphql
      query shopifyAppShopName {
        shop {
          name
        }
      }
    `);
  }
  async oauthCallbackError(error, request2, shop) {
    const { logger: logger2 } = this;
    logger2.error('Error during OAuth callback', {
      shop,
      error: error.message,
    });
    if (error instanceof CookieNotFound) {
      return this.handleAuthBeginRequest(request2, shop);
    }
    if (
      error instanceof InvalidHmacError ||
      error instanceof InvalidOAuthError
    ) {
      return new Response(void 0, {
        status: 400,
        statusText: 'Invalid OAuth Request',
      });
    }
    return new Response(void 0, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
  async handleInvalidOfflineSession(error, request2, shop) {
    const { api, logger: logger2, config } = this;
    if (error instanceof HttpResponseError) {
      if (error.response.code === 401) {
        logger2.info('Shop session is no longer valid, redirecting to OAuth', {
          shop,
        });
        throw await beginAuth({ api, config }, request2, false, shop);
      } else {
        const message2 = JSON.stringify(error.response.body, null, 2);
        logger2.error(
          `Unexpected error during session validation: ${message2}`,
          {
            shop,
          }
        );
        throw new Response(void 0, {
          status: error.response.code,
          statusText: error.response.statusText,
        });
      }
    } else if (error instanceof GraphqlQueryError) {
      const context = { shop };
      if (error.response) {
        context.response = JSON.stringify(error.body);
      }
      logger2.error(
        `Unexpected error during session validation: ${error.message}`,
        context
      );
      throw new Response(void 0, {
        status: 500,
        statusText: 'Internal Server Error',
      });
    }
  }
};

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/strategies/token-exchange.mjs
import '@remix-run/server-runtime';
var TokenExchangeStrategy = class {
  api;
  config;
  logger;
  constructor({ api, config, logger: logger2 }) {
    this.api = api;
    this.config = config;
    this.logger = logger2;
  }
  async respondToOAuthRequests(_request) {}
  async authenticate(request2, sessionContext) {
    const { api, config, logger: logger2 } = this;
    const { shop, session, sessionToken } = sessionContext;
    if (!sessionToken) throw new InvalidJwtError();
    if (!session || !session.isActive(void 0)) {
      logger2.info('No valid session found', { shop });
      logger2.info('Requesting offline access token', { shop });
      const { session: offlineSession } = await this.exchangeToken({
        request: request2,
        sessionToken,
        shop,
        requestedTokenType: RequestedTokenType.OfflineAccessToken,
      });
      await config.sessionStorage.storeSession(offlineSession);
      let newSession = offlineSession;
      if (config.useOnlineTokens) {
        logger2.info('Requesting online access token', { shop });
        const { session: onlineSession } = await this.exchangeToken({
          request: request2,
          sessionToken,
          shop,
          requestedTokenType: RequestedTokenType.OnlineAccessToken,
        });
        await config.sessionStorage.storeSession(onlineSession);
        newSession = onlineSession;
      }
      logger2.debug('Request is valid, loaded session from session token', {
        shop: newSession.shop,
        isOnline: newSession.isOnline,
      });
      try {
        await this.handleAfterAuthHook(
          { api, config, logger: logger2 },
          newSession,
          request2,
          sessionToken
        );
      } catch (errorOrResponse) {
        if (errorOrResponse instanceof Response) {
          throw errorOrResponse;
        }
        throw new Response(void 0, {
          status: 500,
          statusText: 'Internal Server Error',
        });
      }
      return newSession;
    }
    return session;
  }
  handleClientError(request2) {
    const { api, config, logger: logger2 } = this;
    return handleClientErrorFactory({
      request: request2,
      onError: async ({ session, error }) => {
        if (error.response.code === 401) {
          logger2.debug('Responding to invalid access token', {
            shop: getShopFromRequest(request2),
          });
          await invalidateAccessToken({ config, logger: logger2 }, session);
          respondToInvalidSessionToken({
            params: { config, api, logger: logger2 },
            request: request2,
          });
        }
      },
    });
  }
  async exchangeToken({
    request: request2,
    shop,
    sessionToken,
    requestedTokenType,
  }) {
    const { api, config, logger: logger2 } = this;
    try {
      return await api.auth.tokenExchange({
        sessionToken,
        shop,
        requestedTokenType,
      });
    } catch (error) {
      if (
        error instanceof InvalidJwtError ||
        (error instanceof HttpResponseError &&
          error.response.code === 400 &&
          error.response.body?.error === 'invalid_subject_token')
      ) {
        throw respondToInvalidSessionToken({
          params: { api, config, logger: logger2 },
          request: request2,
          retryRequest: true,
        });
      }
      throw new Response(void 0, {
        status: 500,
        statusText: 'Internal Server Error',
      });
    }
  }
  async handleAfterAuthHook(params, session, request2, sessionToken) {
    const { config } = params;
    await config.idempotentPromiseHandler.handlePromise({
      promiseFunction: () => {
        return triggerAfterAuthHook(params, session, request2, this);
      },
      identifier: sessionToken,
    });
  }
};

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/admin/strategies/merchant-custom-app.mjs
import '@remix-run/server-runtime';
var MerchantCustomAuth = class {
  api;
  config;
  logger;
  constructor({ api, config, logger: logger2 }) {
    this.api = api;
    this.config = config;
    this.logger = logger2;
  }
  async respondToOAuthRequests(request2) {
    this.logger.debug('Skipping OAuth request for merchant custom app', {
      shop: getShopFromRequest(request2),
    });
  }
  async authenticate(_request, sessionContext) {
    const { shop } = sessionContext;
    this.logger.debug(
      'Building session from configured access token for merchant custom app',
      { shop }
    );
    const session = this.api.session.customAppSession(shop);
    return session;
  }
  handleClientError(request2) {
    return handleClientErrorFactory({
      request: request2,
      onError: async ({ error }) => {
        if (error.response.code === 401) {
          this.logger.info(
            'Request failed with 401. Review your API credentials or generate new tokens. https://shopify.dev/docs/apps/build/authentication-authorization/access-token-types/generate-app-access-tokens-admin#rotating-api-credentials-for-admin-created-apps '
          );
          throw new ShopifyError(
            'Unauthorized: Access token has been revoked.'
          );
        }
      },
    });
  }
};

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/helpers/idempotent-promise-handler.mjs
var IDENTIFIER_TTL_MS = 6e4;
var IdempotentPromiseHandler = class {
  identifiers;
  constructor() {
    this.identifiers = /* @__PURE__ */ new Map();
  }
  async handlePromise({ promiseFunction, identifier }) {
    try {
      if (this.isPromiseRunnable(identifier)) {
        await promiseFunction();
      }
    } finally {
      this.clearStaleIdentifiers();
    }
    return Promise.resolve();
  }
  isPromiseRunnable(identifier) {
    if (!this.identifiers.has(identifier)) {
      this.identifiers.set(identifier, Date.now());
      return true;
    }
    return false;
  }
  async clearStaleIdentifiers() {
    this.identifiers.forEach((date, identifier, map) => {
      if (Date.now() - date > IDENTIFIER_TTL_MS) {
        map.delete(identifier);
      }
    });
  }
};

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/flow/authenticate.mjs
function authenticateFlowFactory(params) {
  const { api, config, logger: logger2 } = params;
  return async function authenticate2(request2) {
    logger2.info('Authenticating flow request');
    if (request2.method !== 'POST') {
      logger2.debug(
        'Received a non-POST request for flow. Only POST requests are allowed.',
        { url: request2.url, method: request2.method }
      );
      throw new Response(void 0, {
        status: 405,
        statusText: 'Method not allowed',
      });
    }
    const rawBody = await request2.text();
    const result = await api.flow.validate({
      rawBody,
      rawRequest: request2,
    });
    if (!result.valid) {
      logger2.error('Received an invalid flow request', {
        reason: result.reason,
      });
      throw new Response(void 0, {
        status: 400,
        statusText: 'Bad Request',
      });
    }
    const payload = JSON.parse(rawBody);
    logger2.debug('Flow request is valid, looking for an offline session', {
      shop: payload.shopify_domain,
    });
    const sessionId = api.session.getOfflineId(payload.shopify_domain);
    const session = await config.sessionStorage.loadSession(sessionId);
    if (!session) {
      logger2.info('Flow request could not find session', {
        shop: payload.shopify_domain,
      });
      throw new Response(void 0, {
        status: 400,
        statusText: 'Bad Request',
      });
    }
    logger2.debug('Found a session for the flow request', {
      shop: session.shop,
    });
    return {
      session,
      payload,
      admin: adminClientFactory({ params, session }),
    };
  };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/authenticate/fulfillment-service/authenticate.mjs
import '@remix-run/server-runtime';
function authenticateFulfillmentServiceFactory(params) {
  const { api, logger: logger2 } = params;
  return async function authenticate2(request2) {
    logger2.info('Authenticating fulfillment service request');
    if (request2.method !== 'POST') {
      logger2.debug(
        'Received a non-POST request for fulfillment service. Only POST requests are allowed.',
        { url: request2.url, method: request2.method }
      );
      throw new Response(void 0, {
        status: 405,
        statusText: 'Method not allowed',
      });
    }
    const rawBody = await request2.text();
    const result = await api.fulfillmentService.validate({
      rawBody,
      rawRequest: request2,
    });
    if (!result.valid) {
      logger2.error('Received an invalid fulfillment service request', {
        reason: result.reason,
      });
      throw new Response(void 0, {
        status: 400,
        statusText: 'Bad Request',
      });
    }
    const payload = JSON.parse(rawBody);
    const shop = request2.headers.get(ShopifyHeader.Domain) || '';
    logger2.debug(
      'Fulfillment service request is valid, looking for an offline session',
      {
        shop,
      }
    );
    const session = await createOrLoadOfflineSession(shop, params);
    if (!session) {
      logger2.info('Fulfillment service request could not find session', {
        shop,
      });
      throw new Response(void 0, {
        status: 400,
        statusText: 'Bad Request',
      });
    }
    logger2.debug('Found a session for the fulfillment service request', {
      shop,
    });
    return {
      session,
      payload,
      admin: adminClientFactory({ params, session }),
    };
  };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/future/flags.mjs
function logDisabledFutureFlags2(config, logger2) {
  const logFlag = (flag, message2) =>
    logger2.info(`Future flag ${flag} is disabled.

  ${message2}
`);
  if (!config.future.unstable_newEmbeddedAuthStrategy) {
    logFlag(
      'unstable_newEmbeddedAuthStrategy',
      'Enable this to use OAuth token exchange instead of auth code to generate API access tokens.\n  Your app must be using Shopify managed install: https://shopify.dev/docs/apps/auth/installation'
    );
  }
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/shopify-app.mjs
function shopifyApp(appConfig) {
  const api = deriveApi(appConfig);
  const config = deriveConfig(appConfig, api.config);
  const logger2 = overrideLogger(api.logger);
  if (appConfig.webhooks) {
    api.webhooks.addHandlers(appConfig.webhooks);
  }
  const params = { api, config, logger: logger2 };
  let strategy;
  if (config.distribution === AppDistribution.ShopifyAdmin) {
    strategy = new MerchantCustomAuth(params);
  } else if (
    config.future.unstable_newEmbeddedAuthStrategy &&
    config.isEmbeddedApp
  ) {
    strategy = new TokenExchangeStrategy(params);
  } else {
    strategy = new AuthCodeFlowStrategy(params);
  }
  const authStrategy = authStrategyFactory({
    ...params,
    strategy,
  });
  const shopify3 = {
    sessionStorage: config.sessionStorage,
    addDocumentResponseHeaders: addDocumentResponseHeadersFactory(params),
    registerWebhooks: registerWebhooksFactory(params),
    authenticate: {
      admin: authStrategy,
      flow: authenticateFlowFactory(params),
      public: authenticatePublicFactory(params),
      fulfillmentService: authenticateFulfillmentServiceFactory(params),
      webhook: authenticateWebhookFactory(params),
    },
    unauthenticated: {
      admin: unauthenticatedAdminContextFactory(params),
      storefront: unauthenticatedStorefrontContextFactory(params),
    },
  };
  if (
    isAppStoreApp(shopify3, appConfig) ||
    isSingleMerchantApp(shopify3, appConfig)
  ) {
    shopify3.login = loginFactory(params);
  }
  logDisabledFutureFlags2(config, logger2);
  return shopify3;
}
function isAppStoreApp(_shopify, config) {
  return config.distribution === AppDistribution.AppStore;
}
function isSingleMerchantApp(_shopify, config) {
  return config.distribution === AppDistribution.SingleMerchant;
}
function deriveApi(appConfig) {
  let appUrl;
  try {
    appUrl = new URL(appConfig.appUrl);
  } catch (error) {
    const message2 =
      appConfig.appUrl === ''
        ? `Detected an empty appUrl configuration, please make sure to set the necessary environment variables.
If you're deploying your app, you can find more information at https://shopify.dev/docs/apps/launch/deployment/deploy-web-app/deploy-to-hosting-service#step-4-set-up-environment-variables`
        : `Invalid appUrl configuration '${appConfig.appUrl}', please provide a valid URL.`;
    throw new ShopifyError(message2);
  }
  if (appUrl.hostname === 'localhost' && !appUrl.port && process.env.PORT) {
    appUrl.port = process.env.PORT;
  }
  appConfig.appUrl = appUrl.origin;
  let userAgentPrefix = `Shopify Remix Library v${SHOPIFY_REMIX_LIBRARY_VERSION}`;
  if (appConfig.userAgentPrefix) {
    userAgentPrefix = `${appConfig.userAgentPrefix} | ${userAgentPrefix}`;
  }
  return shopifyApi({
    ...appConfig,
    hostName: appUrl.host,
    hostScheme: appUrl.protocol.replace(':', ''),
    userAgentPrefix,
    isEmbeddedApp: appConfig.isEmbeddedApp ?? true,
    apiVersion: appConfig.apiVersion ?? LATEST_API_VERSION,
    isCustomStoreApp: appConfig.distribution === AppDistribution.ShopifyAdmin,
    billing: appConfig.billing,
    future: {
      lineItemBilling: true,
      unstable_managedPricingSupport: true,
    },
    _logDisabledFutureFlags: false,
  });
}
function deriveConfig(appConfig, apiConfig) {
  if (
    !appConfig.sessionStorage &&
    appConfig.distribution !== AppDistribution.ShopifyAdmin
  ) {
    throw new ShopifyError(
      'Please provide a valid session storage. Refer to https://github.com/Shopify/shopify-app-js/blob/main/README.md#session-storage-options for options.'
    );
  }
  const authPathPrefix = appConfig.authPathPrefix || '/auth';
  appConfig.distribution = appConfig.distribution ?? AppDistribution.AppStore;
  return {
    ...appConfig,
    ...apiConfig,
    billing: appConfig.billing,
    scopes: apiConfig.scopes,
    idempotentPromiseHandler: new IdempotentPromiseHandler(),
    canUseLoginForm: appConfig.distribution !== AppDistribution.ShopifyAdmin,
    useOnlineTokens: appConfig.useOnlineTokens ?? false,
    hooks: appConfig.hooks ?? {},
    sessionStorage: appConfig.sessionStorage,
    future: appConfig.future ?? {},
    auth: {
      path: authPathPrefix,
      callbackPath: `${authPathPrefix}/callback`,
      patchSessionTokenPath: `${authPathPrefix}/session-token`,
      exitIframePath: `${authPathPrefix}/exit-iframe`,
      loginPath: `${authPathPrefix}/login`,
    },
    distribution: appConfig.distribution,
  };
}

// node_modules/@shopify/shopify-app-remix/dist/esm/server/index.mjs
setAbstractRuntimeString(() => {
  return `Remix`;
});

// app/shopify.server.js
var import_shopify_app_session_storage_memory = __toESM(require_memory(), 1);

// app/db.server.js
var prisma = new Proxy(
  {},
  {
    get: (target, prop) => {
      return () => {
        console.warn(
          `Prisma call to .${String(prop)}() ignored (Fake DB mode).`
        );
        return Promise.resolve(null);
      };
    },
  }
);

// app/shopify.server.js
var shopify2 = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || '',
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(','),
  appUrl: process.env.SHOPIFY_APP_URL || '',
  authPathPrefix: '/auth',
  sessionStorage:
    new import_shopify_app_session_storage_memory.MemorySessionStorage(),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});
var apiVersion = ApiVersion.January25;
var addDocumentResponseHeaders2 = shopify2.addDocumentResponseHeaders;
var authenticate = shopify2.authenticate;
var unauthenticated = shopify2.unauthenticated;
var login = shopify2.login;
var registerWebhooks = shopify2.registerWebhooks;
var sessionStorage = shopify2.sessionStorage;

// app/routes/app.customize.jsx
import { Fragment, jsx as jsx2, jsxs } from 'react/jsx-runtime';
var FAKE_DB_PATH = path.join(process.cwd(), 'public', 'fake_db.json');
var getFakeTemplates = () => {
  try {
    if (!fs.existsSync(FAKE_DB_PATH)) return [];
    const db = JSON.parse(fs.readFileSync(FAKE_DB_PATH, 'utf-8'));
    return db.templates || [];
  } catch (err) {
    console.error('Error reading fake DB:', err);
    return [];
  }
};
var getFakeDiscounts = () => {
  try {
    if (!fs.existsSync(FAKE_DB_PATH)) return [];
    const db = JSON.parse(fs.readFileSync(FAKE_DB_PATH, 'utf-8'));
    return db.discounts || [];
  } catch (err) {
    console.error('Error reading fake DB:', err);
    return [];
  }
};
var saveFakeDiscounts = (discounts) => {
  try {
    let db = { templates: [], discounts: [] };
    if (fs.existsSync(FAKE_DB_PATH)) {
      db = JSON.parse(fs.readFileSync(FAKE_DB_PATH, 'utf-8'));
    }
    db.discounts = discounts;
    fs.writeFileSync(FAKE_DB_PATH, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Error writing fake DB:', err);
  }
};
var action = async ({ request: request2 }) => {
  if (request2.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }
  try {
    const { session } = await authenticate.admin(request2);
    const formData = await request2.formData();
    const discountData = Object.fromEntries(formData);
    const discounts = getFakeDiscounts();
    if (!discountData.title || !discountData.value) {
      return json({ error: 'Title and value are required' }, { status: 400 });
    }
    const nextId = Math.max(...discounts.map((d) => d.id || 0), 0) + 1;
    const newDiscount = {
      id: nextId,
      title: discountData.title,
      code: discountData.code
        ? discountData.code.toUpperCase()
        : `CODE-${nextId}`,
      type: discountData.type,
      value: discountData.value,
      status: 'active',
      created: /* @__PURE__ */ new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      usage: '0 / Unlimited',
      startsAt: discountData.startsAt,
      endsAt: discountData.endsAt,
      oncePerCustomer: discountData.oncePerCustomer === 'on',
    };
    discounts.push(newDiscount);
    saveFakeDiscounts(discounts);
    console.log(`[Combo App Customize] Discount created: ${newDiscount.title}`);
    return json({
      success: true,
      message: 'Discount code created (Simulated)',
      discount: newDiscount,
    });
  } catch (error) {
    console.error('Discount creation error:', error);
    return json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
};
var loader = async ({ request: request2 }) => {
  const { admin, session } = await authenticate.admin(request2);
  const shop = session.shop;
  const url = new URL(request2.url);
  const templateId = url.searchParams.get('templateId');
  const allDiscounts = getFakeDiscounts();
  const activeDiscounts = allDiscounts
    .filter((d) => d.status === 'active')
    .map((discount) => ({
      id: discount.id,
      title: discount.title,
      type: discount.type,
      status: discount.status,
      value: discount.value,
    }));
  const blocksDir = path.join(
    process.cwd(),
    'extensions',
    'combo-templates',
    'blocks'
  );
  let layoutFiles = [];
  try {
    if (fs.existsSync(blocksDir)) {
      layoutFiles = fs
        .readdirSync(blocksDir)
        .filter((f) => f.endsWith('.liquid'));
    }
  } catch (e) {
    console.error('Error reading blocks directory:', e);
  }
  const allTemplates = getFakeTemplates();
  const shopTemplates = allTemplates.filter((t) => t.shop === shop);
  let shopPages = [];
  try {
    const pagesResponse = await admin.graphql(
      `#graphql
      query getPages {
        pages(first: 50) {
          nodes {
            id
            handle
            title
          }
        }
      }`
    );
    const pagesData = await pagesResponse.json();
    shopPages = pagesData.data.pages.nodes;
  } catch (e) {
    console.error('Error fetching pages:', e);
  }
  let collections = [];
  try {
    console.log('[Customize] Fetching all collections from Shopify...');
    let hasNextPage = true;
    let endCursor = null;
    while (hasNextPage) {
      const query = `#graphql
        query getCollections($cursor: String) {
          collections(first: 250, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              title
              handle
              productsCount {
                count
              }
            }
          }
        }`;
      const response = await admin.graphql(query, {
        variables: { cursor: endCursor },
      });
      const responseJson = await response.json();
      if (responseJson.errors) {
        console.error(
          '[Customize] GraphQL errors while fetching collections:',
          JSON.stringify(responseJson.errors, null, 2)
        );
        break;
      }
      const connection = responseJson.data?.collections;
      if (connection) {
        const nodes = connection.nodes || [];
        const mappedNodes = nodes.map((node) => ({
          id: node.id,
          title: node.title,
          handle: node.handle,
          productsCount:
            typeof node.productsCount === 'object'
              ? node.productsCount?.count
              : node.productsCount,
        }));
        collections.push(...mappedNodes);
        hasNextPage = connection.pageInfo?.hasNextPage || false;
        endCursor = connection.pageInfo?.endCursor || null;
      } else {
        break;
      }
    }
    console.log(
      `[Customize] Successfully fetched ${collections.length} total collections`
    );
  } catch (e) {
    console.error('[Customize] Error fetching collections:', e);
    console.error('[Customize] Error details:', e.message, e.stack);
  }
  let products = [];
  try {
    const productsResponse = await admin.graphql(
      `#graphql
      query getProducts {
        products(first: 50) {
          nodes {
            id
            title
            handle
            featuredImage {
              url
            }
            variants(first: 1) {
              nodes {
                price
              }
            }
          }
        }
      }`
    );
    const productsData = await productsResponse.json();
    products = productsData.data.products.nodes;
  } catch (e) {
    console.error('Error fetching products:', e);
  }
  let initialTemplate = null;
  if (templateId) {
    initialTemplate =
      shopTemplates.find((t) => String(t.id) === String(templateId)) || null;
  }
  const existingTemplates = shopTemplates.map((t) => ({
    id: t.id,
    title: t.title,
  }));
  console.log('[Customize] Loader returning data:');
  console.log('  - Collections:', collections.length);
  console.log('  - Products:', products.length);
  console.log('  - Shop:', shop);
  return json({
    activeDiscounts,
    layoutFiles,
    initialTemplate,
    shop,
    existingTemplates,
    shopPages,
    collections,
    products,
  });
};
function PxField({
  label,
  value,
  onChange,
  min = 0,
  max = 2e3,
  step = 1,
  suffix = 'px',
}) {
  const handle = (v) => {
    const num = Number(v);
    if (Number.isNaN(num)) {
      onChange(0);
      return;
    }
    const clamped = Math.max(min, Math.min(max, num));
    onChange(clamped);
  };
  return /* @__PURE__ */ jsxs('div', {
    className: 'compact-field',
    children: [
      /* @__PURE__ */ jsx2('div', {
        style: {
          marginBottom: 4,
          fontSize: '12px',
          fontWeight: 500,
          color: '#444',
        },
        children: label,
      }),
      /* @__PURE__ */ jsx2(TextField, {
        type: 'number',
        value: String(value ?? 0),
        onChange: handle,
        suffix,
        autoComplete: 'off',
        inputMode: 'numeric',
      }),
    ],
  });
}
var hsbToHex = ({ hue, saturation, brightness }) => {
  const h = hue;
  const s = saturation;
  const b = brightness;
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return b - b * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  const toHex = (x) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(f(5))}${toHex(f(3))}${toHex(f(1))}`;
};
var hexToHsb = (hex) => {
  let r = 0,
    g = 0,
    b = 0;
  if (hex.length === 4) {
    r = parseInt('0x' + hex[1] + hex[1]);
    g = parseInt('0x' + hex[2] + hex[2]);
    b = parseInt('0x' + hex[3] + hex[3]);
  } else if (hex.length === 7) {
    r = parseInt('0x' + hex[1] + hex[2]);
    g = parseInt('0x' + hex[3] + hex[4]);
    b = parseInt('0x' + hex[5] + hex[6]);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  const cmin = Math.min(r, g, b),
    cmax = Math.max(r, g, b),
    delta = cmax - cmin,
    brightness = cmax;
  let hue = 0,
    saturation = 0;
  if (delta === 0) hue = 0;
  else if (cmax === r) hue = ((g - b) / delta) % 6;
  else if (cmax === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;
  saturation = cmax === 0 ? 0 : delta / cmax;
  return { hue, saturation, brightness };
};
var CollapsibleCard = ({ title, expanded, onToggle, children }) => {
  return /* @__PURE__ */ jsxs('div', {
    style: {
      border: '1px solid #e1e3e5',
      borderRadius: '8px',
      marginBottom: '12px',
      overflow: 'hidden',
      background: '#fff',
    },
    children: [
      /* @__PURE__ */ jsxs('div', {
        onClick: onToggle,
        style: {
          padding: '12px 16px',
          background: expanded ? '#f9fafb' : '#fff',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: expanded ? '1px solid #e1e3e5' : 'none',
          transition: 'background 0.2s ease',
        },
        onMouseEnter: (e) => (e.currentTarget.style.background = '#f9fafb'),
        onMouseLeave: (e) =>
          (e.currentTarget.style.background = expanded ? '#f9fafb' : '#fff'),
        children: [
          /* @__PURE__ */ jsx2('span', {
            style: { fontWeight: '600', fontSize: '14px', color: '#202223' },
            children: title,
          }),
          /* @__PURE__ */ jsx2('span', {
            style: {
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              display: 'inline-block',
              fontSize: '10px',
            },
            children: '\u25BC',
          }),
        ],
      }),
      expanded &&
        /* @__PURE__ */ jsx2('div', { style: { padding: '16px' }, children }),
    ],
  });
};
function ColorPickerField({ label, value, onChange }) {
  const [visible, setVisible] = useState(false);
  const [color, setColor] = useState(hexToHsb(value || '#000000'));
  useEffect(() => {
    setColor(hexToHsb(value || '#000000'));
  }, [value]);
  const handleColorChange = (newColor) => {
    setColor(newColor);
    onChange(hsbToHex(newColor));
  };
  const togglePopover = () => setVisible(!visible);
  const activator = /* @__PURE__ */ jsxs('div', {
    onClick: (e) => e.stopPropagation(),
    className: 'compact-field',
    children: [
      /* @__PURE__ */ jsx2('div', {
        style: {
          marginBottom: 4,
          fontSize: '12px',
          fontWeight: 500,
          color: '#444',
        },
        children: label,
      }),
      /* @__PURE__ */ jsx2(TextField, {
        value,
        onChange: (v) => {
          onChange(v);
        },
        autoComplete: 'off',
        prefix: /* @__PURE__ */ jsx2('div', {
          role: 'button',
          onClick: togglePopover,
          style: {
            width: 24,
            height: 24,
            borderRadius: 4,
            backgroundColor: value,
            border: '1px solid #d3d4d5',
            cursor: 'pointer',
          },
        }),
      }),
    ],
  });
  return /* @__PURE__ */ jsx2(Popover, {
    active: visible,
    activator,
    onClose: togglePopover,
    preferredAlignment: 'left',
    children: /* @__PURE__ */ jsx2('div', {
      style: { padding: '16px' },
      children: /* @__PURE__ */ jsx2(ColorPicker, {
        onChange: handleColorChange,
        color,
      }),
    }),
  });
}
var DEFAULT_COMBO_CONFIG = {
  layout: 'layout1',
  // default layout
  product_add_btn_text: 'Add',
  product_add_btn_color: '#000',
  product_add_btn_text_color: '#fff',
  product_add_btn_font_size: 14,
  product_add_btn_font_weight: 600,
  has_discount_offer: false,
  selected_discount_id: null,
  buy_btn_text: 'Buy Now',
  buy_btn_color: '#000',
  buy_btn_text_color: '#fff',
  buy_btn_font_size: 14,
  buy_btn_font_weight: 600,
  add_to_cart_btn_text: 'Add to Cart',
  add_to_cart_btn_color: '#fff',
  add_to_cart_btn_text_color: '#000',
  add_to_cart_btn_font_size: 14,
  add_to_cart_btn_font_weight: 600,
  show_add_to_cart_btn: true,
  show_buy_btn: true,
  // New UI Settings
  show_progress_bar: true,
  progress_bar_color: '#000',
  selection_highlight_color: '#000',
  show_selection_tick: true,
  product_card_variants_display: 'popup',
  // hover, static, popup
  show_quantity_selector: true,
  show_sticky_preview_bar: true,
  grid_layout_type: 'grid',
  // grid, slider
  // Progress bar defaults
  desktop_columns: '3',
  // 3 columns by default for desktop
  mobile_columns: '2',
  // 2 columns by default for mobile
  container_padding_top_desktop: 24,
  // default container padding
  container_padding_right_desktop: 24,
  container_padding_bottom_desktop: 24,
  container_padding_left_desktop: 24,
  container_padding_top_mobile: 16,
  container_padding_right_mobile: 12,
  container_padding_bottom_mobile: 16,
  container_padding_left_mobile: 12,
  show_banner: true,
  // show banner by default
  banner_image_url: '',
  banner_image_mobile_url: '',
  banner_width_desktop: 100,
  banner_width_mobile: 100,
  banner_height_desktop: 180,
  // default desktop banner height for preview
  banner_height_mobile: 120,
  // default mobile banner height for preview
  preview_bg_color: '#ffffff',
  // white default
  preview_text_color: '#222',
  // dark text default
  preview_item_border_color: '#e1e3e5',
  preview_height: 70,
  preview_font_size: 16,
  preview_font_weight: 600,
  preview_align_items: 'center',
  preview_alignment: 'center',
  preview_alignment_mobile: 'center',
  preview_item_shape: 'rectangle',
  preview_item_size: 56,
  preview_item_padding: 12,
  preview_item_padding_top: 10,
  preview_bar_full_width: true,
  preview_bar_padding_top: 16,
  preview_item_color: '#000',
  max_selections: 5,
  preview_bar_padding_bottom: 16,
  show_preview_bar: true,
  // New Button Customization Defaults
  add_btn_text: 'Add',
  add_btn_bg: '#000000',
  add_btn_text_color: '#ffffff',
  checkout_btn_text: 'Proceed to Checkout',
  checkout_btn_bg: '#000000',
  // for layout/main
  checkout_btn_text_color: '#ffffff',
  // for layout/main
  preview_bar_button_bg: '#ffffff',
  // for design 4 preview
  preview_bar_button_text: '#412a8a',
  // for design 4 preview
  // New Price Styling Defaults
  original_price_size: 14,
  discounted_price_size: 18,
  // New Layout Width Defaults
  container_width: 1200,
  title_width: 100,
  banner_width: 100,
  grid_width: 100,
  tabs_width: 100,
  progress_bar_width: 100,
  // Inline (default) preview bar settings
  preview_bar_width: 100,
  preview_bar_bg: '#fff',
  preview_bar_text_color: '#222',
  preview_bar_height: 70,
  preview_bar_text: 'Checkout',
  preview_bar_padding: 16,
  // Sticky preview bar settings
  sticky_preview_bar_full_width: true,
  sticky_preview_bar_width: '100%',
  sticky_preview_bar_bg: '#fff',
  sticky_preview_bar_text_color: '#222',
  sticky_preview_bar_height: 70,
  sticky_preview_bar_text: 'Checkout',
  sticky_preview_bar_padding: 16,
  show_products_grid: true,
  // show product grid by default
  product_image_height_desktop: 250,
  // revert to 250 as per liquid default
  product_image_height_mobile: 200,
  // revert to 200
  // Title & Description defaults
  show_title_description: true,
  collection_title: 'Create Your Combo',
  collection_description: 'Select items to build your perfect bundle.',
  heading_align: 'left',
  heading_size: 28,
  heading_color: '#333333',
  heading_font_weight: '700',
  // Bold by default for titles
  description_align: 'left',
  description_size: 15,
  description_color: '#666666',
  description_font_weight: '400',
  // Normal by default for descriptions
  title_container_padding_top: 0,
  title_container_padding_right: 0,
  title_container_padding_bottom: 0,
  title_container_padding_left: 0,
  description_container_padding_top: 0,
  description_container_padding_right: 0,
  description_container_padding_bottom: 0,
  description_container_padding_left: 0,
  limit_reached_message: 'Limit reached! You can only select {{limit}} items.',
  tab_all_label: 'Collections',
  show_tab_all: false,
  tab_count: 4,
  progress_text: '',
  discount_threshold: 5,
  // Product Card Typography
  product_title_size_desktop: 15,
  product_title_size_mobile: 13,
  product_price_size_desktop: 15,
  product_price_size_mobile: 13,
  product_card_padding: 10,
  products_gap: 12,
  // Layout 3 defaults
  primary_color: '#20D060',
  text_color: '#111111',
  hero_image_url: '',
  hero_title: 'Mega Breakfast Bundle',
  hero_subtitle: 'Milk, Bread, Eggs, Cereal & Juice',
  hero_price: '$14.99',
  hero_compare_price: '$24.50',
  hero_btn_text: 'Add to Cart - Save 38%',
  show_hero: true,
  timer_hours: 2,
  timer_minutes: 45,
  timer_seconds: 12,
  discount_percentage: 20,
  banner_fit_mode: 'cover',
  // cover, contain, adapt
  banner_full_width: false,
  // Banner Slider Settings
  enable_banner_slider: true,
  slider_speed: 5,
  banner_1_image:
    'https://cdn.shopify.com/s/files/1/0070/7032/files/fresh-vegetables-and-fruits.jpg?v=1614349455',
  banner_1_title: 'Fresh Farm Produce',
  banner_1_subtitle: 'Get 20% off on all organic items',
  banner_2_image:
    'https://cdn.shopify.com/s/files/1/0070/7032/files/fresh-fruits.jpg?v=1614349455',
  banner_2_title: 'Seasonal Fruits',
  banner_2_subtitle: 'Picked fresh from the orchard',
  banner_3_image:
    'https://cdn.shopify.com/s/files/1/0070/7032/files/fresh-vegetables.jpg?v=1614349455',
  banner_3_title: 'Green Wellness',
  banner_3_subtitle: 'Healthy greens for a healthy life',
  // Advanced Timer & Bundle Settings
  auto_reset_timer: true,
  change_bundle_on_timer_end: true,
  bundle_titles: 'Mega Breakfast,Healthy Lunch,Organic Dinner',
  bundle_subtitles:
    'Start your day right,Stay energized all day,Clean eating for tonight',
  discount_motivation_text:
    'Add {{remaining}} more items to unlock the discount!',
  discount_unlocked_text: 'Discount Unlocked!',
};
function Customize() {
  const shopify3 = useAppBridge();
  const {
    activeDiscounts = [],
    layoutFiles = [],
    initialTemplate = null,
    shop,
    existingTemplates = [],
    shopPages = [],
    collections = [],
    products = [],
  } = useLoaderData();
  const discountFetcher = useFetcher();
  const saveFetcher = useFetcher();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  useEffect(() => {
    if (saveFetcher.data?.success) {
      shopify3.toast.show(
        saveFetcher.data.message || 'Template saved successfully!'
      );
      navigate('/app/templates');
    } else if (saveFetcher.data?.error) {
      shopify3.toast.show(`Failed to save: ${saveFetcher.data.error}`, {
        isError: true,
      });
    }
  }, [saveFetcher.data, shopify3, navigate]);
  const [config, setConfig] = useState(() => ({
    ...DEFAULT_COMBO_CONFIG,
    ...(initialTemplate?.config || {}),
  }));
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState(
    initialTemplate?.title || 'Untitled Template'
  );
  const [publishToPage, setPublishToPage] = useState(true);
  const [targetPageTitle, setTargetPageTitle] = useState('About Us');
  const [targetPageHandle, setTargetPageHandle] = useState('about-us');
  const [publishType, setPublishType] = useState('new');
  const [selectedPageId, setSelectedPageId] = useState('');
  const [titleError, setTitleError] = useState('');
  useEffect(() => {
    if (
      saveTitle &&
      saveTitle !== 'Untitled Template' &&
      targetPageTitle === 'About Us'
    ) {
      const slug = saveTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      setTargetPageTitle(saveTitle);
      setTargetPageHandle(slug);
    }
  }, [saveTitle]);
  const handleTitleChange = (value) => {
    setSaveTitle(value);
    if (titleError) setTitleError('');
  };
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [activeCategory, setActiveCategory] = useState('layout');
  const [activeTab, setActiveTab] = useState('all');
  const [productsLoading, setProductsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    general: true,
    banner: false,
    content: false,
    products: false,
    productCard: false,
    variants: false,
    previewBar: false,
    discount: false,
    styles: false,
    progressBar: false,
  });
  const toggleSection = (sectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };
  useEffect(() => {
    if (initialTemplate) {
      console.log('Loading template:', initialTemplate.title);
      setConfig({
        ...DEFAULT_COMBO_CONFIG,
        ...(initialTemplate.config || {}),
      });
      setSaveTitle(initialTemplate.title || 'Untitled Template');
      setFormKey((prev) => prev + 1);
    } else {
      const templateId = searchParams.get('templateId');
      if (!templateId) {
        setConfig({ ...DEFAULT_COMBO_CONFIG });
        setSaveTitle('Untitled Template');
        setFormKey((prev) => prev + 1);
      }
    }
  }, [initialTemplate, searchParams]);
  const [selectedVariants2, setSelectedVariants2] = useState({});
  useEffect(() => {
    console.log('[Customize Frontend] Collections received:', collections);
    console.log(
      '[Customize Frontend] Collections count:',
      collections?.length || 0
    );
  }, [collections]);
  const [shopifyProducts2, setShopifyProducts] = useState([]);
  useEffect(() => {
    const fetchProducts = () => {
      let handle = config.collection_handle || config.step_1_collection;
      if (config.layout === 'layout2') {
        handle = activeTab === 'all' ? '' : activeTab;
      }
      const url =
        handle && handle !== ''
          ? `/api/products?handle=${handle}`
          : `/api/products`;
      console.log(
        `[Customize DEBUG] Fetching. Tab: "${activeTab}", Handle: "${handle}", URL: ${url}`
      );
      setProductsLoading(true);
      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          console.log(`[Customize DEBUG] Success. Count: ${data?.length || 0}`);
          setShopifyProducts(Array.isArray(data) ? data : []);
          setProductsLoading(false);
        })
        .catch((err) => {
          console.error('[Customize DEBUG] Error:', err);
          setShopifyProducts([]);
          setProductsLoading(false);
        });
    };
    fetchProducts();
  }, [
    config.collection_handle,
    config.layout,
    activeTab,
    config.col_1,
    config.col_2,
    config.col_3,
    config.col_4,
    config.col_5,
    config.col_6,
    config.col_7,
    config.col_8,
  ]);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(600);
  useEffect(() => {
    let resizeTimeout = null;
    const updateWidth = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (containerRef.current) {
          setContainerWidth(containerRef.current.offsetWidth);
        }
      }, 150);
    };
    window.addEventListener('resize', updateWidth);
    const timer = setTimeout(updateWidth, 100);
    return () => {
      window.removeEventListener('resize', updateWidth);
      clearTimeout(timer);
    };
  }, []);
  const [createDiscountModalOpen, setCreateDiscountModalOpen] = useState(false);
  const [dTitle, setDTitle] = useState('');
  const [dCode, setDCode] = useState('');
  const [dType, setDType] = useState('percentage');
  const [dValue, setDValue] = useState('');
  const [dStartsAt, setDStartsAt] = useState('');
  const [dEndsAt, setDEndsAt] = useState('');
  const [dOncePerCustomer, setDOncePerCustomer] = useState(false);
  const [dAutoApply, setDAutoApply] = useState(false);
  const [localActiveDiscounts, setLocalActiveDiscounts] =
    useState(activeDiscounts);
  useEffect(() => {
    setLocalActiveDiscounts(activeDiscounts);
  }, [activeDiscounts]);
  useEffect(() => {
    const layoutParam = searchParams.get('layout');
    console.log('URL layout parameter:', layoutParam);
    if (layoutParam) {
      const layoutMap = {
        combo_design_one: 'layout1',
        combo_design_two: 'layout2',
        combo_design_three: 'layout3',
        combo_design_four: 'layout4',
        custom_bundle_layout: 'layout1',
        // Default fallback
      };
      const mappedLayout = layoutMap[layoutParam] || 'layout1';
      console.log('Mapped layout:', mappedLayout);
      setConfig((prev) => ({
        ...prev,
        layout: mappedLayout,
      }));
    }
  }, [searchParams]);
  useEffect(() => {
    if (
      config.layout === 'layout2' &&
      !config.show_tab_all &&
      activeTab === 'all'
    ) {
      const firstCol =
        config.col_1 ||
        config.col_2 ||
        config.col_3 ||
        config.col_4 ||
        config.col_5 ||
        config.col_6 ||
        config.col_7 ||
        config.col_8;
      if (firstCol) {
        setActiveTab(firstCol);
      }
    }
  }, [
    config.layout,
    config.show_tab_all,
    activeTab,
    config.col_1,
    config.col_2,
    config.col_3,
    config.col_4,
    config.col_5,
    config.col_6,
    config.col_7,
    config.col_8,
  ]);
  useEffect(() => {
    if (discountFetcher.data) {
      if (discountFetcher.data.success) {
        shopify3.toast.show('Discount created successfully on Shopify!');
        setLocalActiveDiscounts((prev) => {
          const fromServer = discountFetcher.data.discount;
          const nextId = fromServer?.id
            ? Number(fromServer.id)
            : Math.max(...prev.map((d) => d.id || 0), 0) + 1;
          const newDiscount = fromServer ?? {
            id: nextId,
            title: dTitle,
            type: dType,
          };
          updateConfig('selected_discount_id', nextId);
          updateConfig('has_discount_offer', true);
          return [...prev, newDiscount];
        });
        setDTitle('');
        setDCode('');
        setDType('percentage');
        setDValue('');
        setDStartsAt('');
        setDEndsAt('');
        setDOncePerCustomer(false);
        setDAutoApply(false);
        setCreateDiscountModalOpen(false);
      } else if (discountFetcher.data.error) {
        shopify3.toast.show(discountFetcher.data.error, { isError: true });
      }
    }
  }, [discountFetcher.data, shopify3]);
  const updateConfig = useCallback((key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);
  const updateBoth = useCallback((keyA, keyB, value) => {
    setConfig((prev) => ({ ...prev, [keyA]: value, [keyB]: value }));
  }, []);
  const confirmSaveTemplate = async () => {
    const templateTitle = (saveTitle || 'Untitled Template').trim();
    const isDuplicate = existingTemplates.some((t) => {
      if (initialTemplate && String(t.id) === String(initialTemplate.id))
        return false;
      return t.title.toLowerCase() === templateTitle.toLowerCase();
    });
    if (isDuplicate) {
      setTitleError('This name is already used. Please choose a new name.');
      return;
    }
    if (!saveTitle) {
      setTitleError('Please enter a template title');
      return;
    }
    setSaveModalOpen(false);
    shopify3.toast.show(`Saving "${saveTitle}"...`);
    const isEditing = !!initialTemplate;
    const body = {
      resource: 'templates',
      action: isEditing ? 'update' : 'create',
      id: isEditing ? initialTemplate.id : void 0,
      data: {
        title: saveTitle,
        config,
      },
      publishParams: publishToPage
        ? {
            title: targetPageTitle,
            handle: targetPageHandle,
            publishType,
            selectedPageId,
          }
        : null,
    };
    const formData = new FormData();
    formData.append('body', JSON.stringify(body));
    saveFetcher.submit(formData, {
      method: 'POST',
      action: '/api/fake-backend',
    });
  };
  const handleCreateDiscount = () => {
    if (!dTitle || !dValue) {
      shopify3.toast.show(
        'Please fill in all required fields (Title and Value)',
        {
          isError: true,
        }
      );
      return;
    }
    const formData = new FormData();
    formData.append('title', dTitle);
    formData.append('code', dCode || dTitle.toUpperCase().replace(/\s+/g, ''));
    formData.append('type', dType);
    formData.append('value', dValue);
    formData.append(
      'startsAt',
      dStartsAt || /* @__PURE__ */ new Date().toISOString()
    );
    formData.append('endsAt', dEndsAt || '');
    formData.append('oncePerCustomer', dOncePerCustomer ? 'on' : 'off');
    discountFetcher.submit(formData, { method: 'post' });
  };
  return /* @__PURE__ */ jsxs(Page, {
    title: 'Customize Template',
    titleMetadata: /* @__PURE__ */ jsx2('div', {
      style: { width: 40 },
      children: /* @__PURE__ */ jsx2(Icon, { source: EditIcon, tone: 'base' }),
    }),
    primaryAction: {
      content: 'Save Template',
      onAction: () => setSaveModalOpen(true),
    },
    secondaryActions: [
      {
        content: 'Reset to Default',
        onAction: () => setResetModalOpen(true),
      },
    ],
    children: [
      /* @__PURE__ */ jsx2('div', { style: { marginBottom: '10px' } }),
      /* @__PURE__ */ jsx2(Modal, {
        open: saveModalOpen,
        onClose: () => setSaveModalOpen(false),
        title: 'Save Template',
        primaryAction: { content: 'Save', onAction: confirmSaveTemplate },
        secondaryActions: [
          { content: 'Cancel', onAction: () => setSaveModalOpen(false) },
        ],
        children: /* @__PURE__ */ jsx2(Modal.Section, {
          children: /* @__PURE__ */ jsxs(FormLayout, {
            children: [
              /* @__PURE__ */ jsx2(TextField, {
                label: 'Template Title',
                value: saveTitle,
                onChange: handleTitleChange,
                autoComplete: 'off',
                error: titleError,
              }),
              /* @__PURE__ */ jsx2(Checkbox, {
                label:
                  'Automatically create/update a Shopify Page for this combo',
                checked: publishToPage,
                onChange: setPublishToPage,
                helpText:
                  'This will link your combo design to a specific page on your store.',
              }),
              publishToPage &&
                /* @__PURE__ */ jsx2('div', {
                  style: {
                    marginTop: 8,
                    padding: 12,
                    background: '#f6f6f7',
                    borderRadius: 8,
                  },
                  children: /* @__PURE__ */ jsxs(FormLayout, {
                    children: [
                      /* @__PURE__ */ jsxs(ButtonGroup, {
                        segmented: true,
                        fullWidth: true,
                        children: [
                          /* @__PURE__ */ jsx2(Button, {
                            pressed: publishType === 'new',
                            onClick: () => setPublishType('new'),
                            children: 'Create New Page',
                          }),
                          /* @__PURE__ */ jsx2(Button, {
                            pressed: publishType === 'existing',
                            onClick: () => setPublishType('existing'),
                            children: 'Use Existing Page',
                          }),
                        ],
                      }),
                      publishType === 'new'
                        ? /* @__PURE__ */ jsxs(Fragment, {
                            children: [
                              /* @__PURE__ */ jsx2(TextField, {
                                label: 'Target Page Title',
                                value: targetPageTitle,
                                onChange: setTargetPageTitle,
                                autoComplete: 'off',
                              }),
                              /* @__PURE__ */ jsx2(TextField, {
                                label: 'Target Page Handle (URL slug)',
                                value: targetPageHandle,
                                onChange: setTargetPageHandle,
                                autoComplete: 'off',
                                prefix: '/pages/',
                              }),
                            ],
                          })
                        : /* @__PURE__ */ jsx2(Select, {
                            label: 'Select an existing page',
                            options: [
                              { label: 'Select a page...', value: '' },
                              ...shopPages.map((p) => ({
                                label: p.title,
                                value: p.id,
                              })),
                            ],
                            value: selectedPageId,
                            onChange: (id) => {
                              setSelectedPageId(id);
                              const page = shopPages.find((p) => p.id === id);
                              if (page) {
                                setTargetPageTitle(page.title);
                                setTargetPageHandle(page.handle);
                              }
                            },
                          }),
                    ],
                  }),
                }),
              /* @__PURE__ */ jsx2('p', {
                style: { color: '#666', marginTop: 4 },
                children:
                  'Confirm to save the current customization as a template.',
              }),
            ],
          }),
        }),
      }),
      /* @__PURE__ */ jsx2(Modal, {
        open: resetModalOpen,
        onClose: () => setResetModalOpen(false),
        title: 'Reset Template',
        primaryAction: {
          content: 'Reset',
          destructive: true,
          onAction: () => {
            console.log('Resetting to factory defaults');
            setConfig({ ...DEFAULT_COMBO_CONFIG });
            setSaveTitle(
              DEFAULT_COMBO_CONFIG.collection_title || 'Untitled Template'
            );
            setFormKey((prev) => prev + 1);
            setResetModalOpen(false);
          },
        },
        secondaryActions: [
          {
            content: 'Cancel',
            onAction: () => setResetModalOpen(false),
          },
        ],
        children: /* @__PURE__ */ jsx2(Modal.Section, {
          children: /* @__PURE__ */ jsx2('p', {
            children:
              'Are you sure you want to reset all settings to default? This action cannot be undone.',
          }),
        }),
      }),
      /* @__PURE__ */ jsxs(
        'div',
        {
          style: {
            display: 'grid',
            gridTemplateColumns: '65% 35%',
            gap: '10px',
          },
          children: [
            /* @__PURE__ */ jsx2('div', {
              children: /* @__PURE__ */ jsxs('div', {
                style: { position: 'sticky', top: 16, zIndex: 10 },
                children: [
                  /* @__PURE__ */ jsx2(Card, {
                    sectioned: true,
                    children: /* @__PURE__ */ jsx2(FormLayout, {
                      children: /* @__PURE__ */ jsx2(TextField, {
                        label: 'Template Title',
                        value: saveTitle,
                        onChange: handleTitleChange,
                        autoComplete: 'off',
                        helpText: 'This is the name of your saved template.',
                        error: titleError,
                      }),
                    }),
                  }),
                  /* @__PURE__ */ jsx2('div', { style: { marginTop: '10px' } }),
                  /* @__PURE__ */ jsxs(Card, {
                    title: 'Preview',
                    sectioned: true,
                    children: [
                      /* @__PURE__ */ jsx2('div', {
                        style: {
                          display: 'flex',
                          justifyContent: 'center',
                          marginBottom: 16,
                        },
                        children: /* @__PURE__ */ jsxs(ButtonGroup, {
                          segmented: true,
                          children: [
                            /* @__PURE__ */ jsx2(Button, {
                              icon: DesktopIcon,
                              pressed: previewDevice === 'desktop',
                              onClick: () => setPreviewDevice('desktop'),
                              children: 'Desktop',
                            }),
                            /* @__PURE__ */ jsx2(Button, {
                              icon: MobileIcon,
                              pressed: previewDevice === 'mobile',
                              onClick: () => setPreviewDevice('mobile'),
                              children: 'Mobile',
                            }),
                          ],
                        }),
                      }),
                      /* @__PURE__ */ jsx2('div', {
                        style: {
                          width: previewDevice === 'mobile' ? '375px' : '100%',
                          height: previewDevice === 'mobile' ? '667px' : 'auto',
                          aspectRatio:
                            previewDevice === 'desktop' ? '16 / 9' : 'auto',
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          background: '#fff',
                          margin: '0 auto',
                          // Center it
                          // Device Frame Styles
                          border: '1px solid #e1e3e5',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          transition:
                            'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                          position: 'relative',
                        },
                        className: 'preview-device-container',
                        children: /* @__PURE__ */ jsx2(ComboPreview, {
                          config,
                          device: previewDevice,
                          products: shopifyProducts2,
                          collections,
                          activeTab,
                          setActiveTab,
                          isLoading: productsLoading,
                          activeDiscounts: localActiveDiscounts,
                        }),
                      }),
                    ],
                  }),
                ],
              }),
            }),
            /* @__PURE__ */ jsxs('div', {
              style: {
                background: '#fff',
                border: '1px solid #e1e3e5',
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 40px)',
                maxHeight: 'calc(100vh - 40px)',
              },
              children: [
                /* @__PURE__ */ jsx2('div', {
                  style: {
                    display: 'flex',
                    borderBottom: '1px solid #e1e3e5',
                    background: '#fff',
                    userSelect: 'none',
                  },
                  children: [
                    { id: 'layout', label: 'Layout', icon: LayoutColumns3Icon },
                    { id: 'style', label: 'Style', icon: PaintBrushFlatIcon },
                    { id: 'advanced', label: 'Advanced', icon: SettingsIcon },
                  ].map((cat) =>
                    /* @__PURE__ */ jsxs(
                      'div',
                      {
                        onClick: () => setActiveCategory(cat.id),
                        style: {
                          flex: 1,
                          padding: '10px 4px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          borderBottom:
                            activeCategory === cat.id
                              ? '3px solid #000'
                              : '3px solid transparent',
                          color: activeCategory === cat.id ? '#000' : '#6d7175',
                          transition: 'all 0.2s ease',
                          fontWeight: activeCategory === cat.id ? '600' : '400',
                        },
                        children: [
                          /* @__PURE__ */ jsx2('div', {
                            style: {
                              color:
                                activeCategory === cat.id ? '#000' : '#8c9196',
                            },
                            children: /* @__PURE__ */ jsx2(Icon, {
                              source: cat.icon,
                              color:
                                activeCategory === cat.id ? 'brand' : 'subdued',
                            }),
                          }),
                          /* @__PURE__ */ jsx2('div', {
                            style: {
                              fontSize: '10px',
                              fontWeight: 'bold',
                              textTransform: 'uppercase',
                            },
                            children: cat.label,
                          }),
                        ],
                      },
                      cat.id
                    )
                  ),
                }),
                /* @__PURE__ */ jsxs('div', {
                  style: {
                    padding: '16px',
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    minHeight: 0,
                  },
                  children: [
                    activeCategory === 'layout' &&
                      /* @__PURE__ */ jsxs(Fragment, {
                        children: [
                          config.layout === 'layout1' &&
                            /* @__PURE__ */ jsx2(CollapsibleCard, {
                              title: 'Steps & Collections',
                              expanded: expandedSections.general,
                              onToggle: () => toggleSection('general'),
                              children: /* @__PURE__ */ jsxs(FormLayout, {
                                children: [
                                  /* @__PURE__ */ jsxs('div', {
                                    style: { marginBottom: 12 },
                                    children: [
                                      /* @__PURE__ */ jsx2(Text, {
                                        variant: 'headingSm',
                                        as: 'h6',
                                        children: 'Collection Configuration',
                                      }),
                                      /* @__PURE__ */ jsx2('p', {
                                        style: {
                                          fontSize: '13px',
                                          color: '#666',
                                        },
                                        children:
                                          'Configure the collections for your "Build Your Box" flow. The number of collections is tied to the items required for the discount.',
                                      }),
                                    ],
                                  }),
                                  /* @__PURE__ */ jsxs('div', {
                                    style: {
                                      background: '#f4f6f8',
                                      padding: '16px',
                                      borderRadius: '8px',
                                      marginBottom: '20px',
                                      border: '1px solid #e1e3e5',
                                    },
                                    children: [
                                      /* @__PURE__ */ jsx2(Text, {
                                        variant: 'bodyMd',
                                        as: 'p',
                                        fontWeight: 'bold',
                                        style: { marginBottom: '8px' },
                                        children: 'Bundle Rule',
                                      }),
                                      /* @__PURE__ */ jsxs(FormLayout.Group, {
                                        children: [
                                          /* @__PURE__ */ jsx2(TextField, {
                                            label:
                                              'Items to Unlock Discount (Combo Size)',
                                            type: 'number',
                                            value: String(
                                              config.discount_threshold || 5
                                            ),
                                            onChange: (v) =>
                                              updateConfig(
                                                'discount_threshold',
                                                Math.max(1, Number(v))
                                              ),
                                            autoComplete: 'off',
                                            helpText:
                                              'This defines the number of products (collections) in your combo.',
                                          }),
                                          /* @__PURE__ */ jsx2(TextField, {
                                            label: 'Discount Label',
                                            value:
                                              config.discount_text || '20% OFF',
                                            onChange: (v) =>
                                              updateConfig('discount_text', v),
                                            autoComplete: 'off',
                                            helpText:
                                              'Text shown on progress bar',
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                                  [
                                    ...Array(
                                      Number(config.discount_threshold || 5)
                                    ),
                                  ].map((_, index) => {
                                    const step = index + 1;
                                    return /* @__PURE__ */ jsxs(
                                      'div',
                                      {
                                        style: {
                                          background: '#f9fafb',
                                          padding: '12px',
                                          borderRadius: '8px',
                                          marginBottom: '12px',
                                          border: '1px solid #e1e3e5',
                                        },
                                        children: [
                                          /* @__PURE__ */ jsxs(Text, {
                                            variant: 'bodyMd',
                                            as: 'p',
                                            fontWeight: 'bold',
                                            style: { marginBottom: '8px' },
                                            children: ['Collection ', step],
                                          }),
                                          /* @__PURE__ */ jsxs(FormLayout, {
                                            children: [
                                              /* @__PURE__ */ jsxs(
                                                FormLayout.Group,
                                                {
                                                  children: [
                                                    /* @__PURE__ */ jsx2(
                                                      TextField,
                                                      {
                                                        label: 'Title',
                                                        value:
                                                          config[
                                                            `step_${step}_title`
                                                          ] || '',
                                                        onChange: (v) =>
                                                          updateConfig(
                                                            `step_${step}_title`,
                                                            v
                                                          ),
                                                        autoComplete: 'off',
                                                        placeholder: `e.g. ${step === 1 ? 'Cleanser' : step === 2 ? 'Toner' : 'Product'}`,
                                                      }
                                                    ),
                                                    /* @__PURE__ */ jsx2(
                                                      TextField,
                                                      {
                                                        label: 'Subtitle',
                                                        value:
                                                          config[
                                                            `step_${step}_subtitle`
                                                          ] || '',
                                                        onChange: (v) =>
                                                          updateConfig(
                                                            `step_${step}_subtitle`,
                                                            v
                                                          ),
                                                        autoComplete: 'off',
                                                        placeholder:
                                                          'e.g. Select one',
                                                      }
                                                    ),
                                                  ],
                                                }
                                              ),
                                              /* @__PURE__ */ jsxs(
                                                FormLayout.Group,
                                                {
                                                  children: [
                                                    /* @__PURE__ */ jsx2(
                                                      Select,
                                                      {
                                                        label: 'Collection',
                                                        options: [
                                                          {
                                                            label:
                                                              '-- Choose a collection --',
                                                            value: '',
                                                          },
                                                          ...(
                                                            collections || []
                                                          ).map((col) => ({
                                                            label: col.title,
                                                            value: col.handle,
                                                          })),
                                                        ],
                                                        value:
                                                          config[
                                                            `step_${step}_collection`
                                                          ] || '',
                                                        onChange: (v) =>
                                                          updateConfig(
                                                            `step_${step}_collection`,
                                                            v
                                                          ),
                                                      }
                                                    ),
                                                    /* @__PURE__ */ jsx2(
                                                      TextField,
                                                      {
                                                        label:
                                                          'Selection Limit',
                                                        type: 'number',
                                                        value: String(
                                                          config[
                                                            `step_${step}_limit`
                                                          ] || 1
                                                        ),
                                                        onChange: (v) =>
                                                          updateConfig(
                                                            `step_${step}_limit`,
                                                            Math.max(
                                                              1,
                                                              Number(v)
                                                            )
                                                          ),
                                                        autoComplete: 'off',
                                                        helpText:
                                                          'Max items from this category',
                                                      }
                                                    ),
                                                  ],
                                                }
                                              ),
                                            ],
                                          }),
                                        ],
                                      },
                                      step
                                    );
                                  }),
                                ],
                              }),
                            }),
                          config.layout === 'layout2' &&
                            /* @__PURE__ */ jsx2(CollapsibleCard, {
                              title: 'Collections (Switching Tabs)',
                              expanded: expandedSections.general,
                              onToggle: () => toggleSection('general'),
                              children: /* @__PURE__ */ jsxs(FormLayout, {
                                children: [
                                  /* @__PURE__ */ jsxs('div', {
                                    style: { marginBottom: 12 },
                                    children: [
                                      /* @__PURE__ */ jsx2(Text, {
                                        variant: 'headingSm',
                                        as: 'h6',
                                        children: 'Collection Configuration',
                                      }),
                                      /* @__PURE__ */ jsx2('p', {
                                        style: {
                                          fontSize: '13px',
                                          color: '#666',
                                        },
                                        children:
                                          'Select up to 8 collections. They will appear as switching tabs in Template Two.',
                                      }),
                                    ],
                                  }),
                                  /* @__PURE__ */ jsxs('div', {
                                    style: {
                                      display: 'flex',
                                      gap: '20px',
                                      alignItems: 'center',
                                      marginBottom: '12px',
                                      flexWrap: 'wrap',
                                    },
                                    children: [
                                      /* @__PURE__ */ jsx2(Checkbox, {
                                        label: "Show 'All/Collections' Tab",
                                        checked: !!config.show_tab_all,
                                        onChange: (v) =>
                                          updateConfig('show_tab_all', v),
                                      }),
                                      /* @__PURE__ */ jsx2(TextField, {
                                        label: 'First Tab Label',
                                        value:
                                          config.tab_all_label || 'Collections',
                                        onChange: (v) =>
                                          updateConfig('tab_all_label', v),
                                        autoComplete: 'off',
                                      }),
                                    ],
                                  }),
                                  /* @__PURE__ */ jsx2(PxField, {
                                    label: 'Tabs Section Width (%)',
                                    value: config.tabs_width,
                                    onChange: (v) =>
                                      updateConfig('tabs_width', v),
                                    min: 10,
                                    max: 100,
                                    suffix: '%',
                                    helpText:
                                      'Adjust how much of the screen width the tabs should use',
                                  }),
                                  /* @__PURE__ */ jsx2('div', {
                                    style: { marginBottom: 12 },
                                    children: /* @__PURE__ */ jsx2(TextField, {
                                      label: 'Number of Collections',
                                      type: 'number',
                                      value: String(config.tab_count || 4),
                                      onChange: (v) =>
                                        updateConfig('tab_count', Number(v)),
                                      min: 1,
                                      max: 8,
                                      autoComplete: 'off',
                                    }),
                                  }),
                                  /* @__PURE__ */ jsx2('div', {
                                    style: {
                                      display: 'grid',
                                      gridTemplateColumns: '1fr',
                                      gap: '12px',
                                      marginTop: '12px',
                                    },
                                    children: [
                                      ...Array(config.tab_count || 4),
                                    ].map((_, index) => {
                                      const i = index + 1;
                                      return /* @__PURE__ */ jsx2(
                                        Select,
                                        {
                                          label: `Collection ${i}`,
                                          options: [
                                            { label: '-- None --', value: '' },
                                            ...(collections || []).map(
                                              (col) => ({
                                                label: col.title,
                                                value: col.handle,
                                              })
                                            ),
                                          ],
                                          value: config[`col_${i}`] || '',
                                          onChange: (v) =>
                                            updateConfig(`col_${i}`, v),
                                        },
                                        i
                                      );
                                    }),
                                  }),
                                ],
                              }),
                            }),
                          config.layout === 'layout3' &&
                            /* @__PURE__ */ jsxs(Fragment, {
                              children: [
                                /* @__PURE__ */ jsx2(CollapsibleCard, {
                                  title: 'Hero Deal Card',
                                  expanded: expandedSections.hero,
                                  onToggle: () => toggleSection('hero'),
                                  children: /* @__PURE__ */ jsxs(FormLayout, {
                                    children: [
                                      /* @__PURE__ */ jsx2(Checkbox, {
                                        label: 'Show Deal of the Day',
                                        checked: config.show_hero !== false,
                                        onChange: (v) =>
                                          updateConfig('show_hero', v),
                                      }),
                                      config.show_hero !== false &&
                                        /* @__PURE__ */ jsxs(Fragment, {
                                          children: [
                                            /* @__PURE__ */ jsx2(TextField, {
                                              label: 'Hero Image URL',
                                              value:
                                                config.hero_image_url || '',
                                              onChange: (v) =>
                                                updateConfig(
                                                  'hero_image_url',
                                                  v
                                                ),
                                              autoComplete: 'off',
                                              placeholder:
                                                'https://example.com/image.jpg',
                                            }),
                                            /* @__PURE__ */ jsx2(TextField, {
                                              label: 'Hero Title',
                                              value:
                                                config.hero_title ||
                                                'Mega Breakfast Bundle',
                                              onChange: (v) =>
                                                updateConfig('hero_title', v),
                                              autoComplete: 'off',
                                            }),
                                            /* @__PURE__ */ jsx2(TextField, {
                                              label: 'Hero Subtitle',
                                              value:
                                                config.hero_subtitle ||
                                                'Milk, Bread, Eggs, Cereal & Juice',
                                              onChange: (v) =>
                                                updateConfig(
                                                  'hero_subtitle',
                                                  v
                                                ),
                                              autoComplete: 'off',
                                            }),
                                            /* @__PURE__ */ jsxs('div', {
                                              style: {
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: '12px',
                                              },
                                              children: [
                                                /* @__PURE__ */ jsx2(
                                                  TextField,
                                                  {
                                                    label: 'Hero Price',
                                                    value:
                                                      config.hero_price ||
                                                      '$14.99',
                                                    onChange: (v) =>
                                                      updateConfig(
                                                        'hero_price',
                                                        v
                                                      ),
                                                    autoComplete: 'off',
                                                  }
                                                ),
                                                /* @__PURE__ */ jsx2(
                                                  TextField,
                                                  {
                                                    label: 'Compare Price',
                                                    value:
                                                      config.hero_compare_price ||
                                                      '$24.50',
                                                    onChange: (v) =>
                                                      updateConfig(
                                                        'hero_compare_price',
                                                        v
                                                      ),
                                                    autoComplete: 'off',
                                                  }
                                                ),
                                              ],
                                            }),
                                            /* @__PURE__ */ jsx2(TextField, {
                                              label: 'Button Text',
                                              value:
                                                config.hero_btn_text ||
                                                'Add to Cart - Save 38%',
                                              onChange: (v) =>
                                                updateConfig(
                                                  'hero_btn_text',
                                                  v
                                                ),
                                              autoComplete: 'off',
                                            }),
                                            /* @__PURE__ */ jsxs('div', {
                                              style: { marginTop: 12 },
                                              children: [
                                                /* @__PURE__ */ jsx2(Text, {
                                                  variant: 'headingSm',
                                                  as: 'h6',
                                                  children: 'Countdown Timer',
                                                }),
                                                /* @__PURE__ */ jsxs('div', {
                                                  style: {
                                                    display: 'grid',
                                                    gridTemplateColumns:
                                                      '1fr 1fr 1fr',
                                                    gap: '12px',
                                                    marginTop: '8px',
                                                  },
                                                  children: [
                                                    /* @__PURE__ */ jsx2(
                                                      RangeSlider,
                                                      {
                                                        label: 'Hours',
                                                        value:
                                                          config.timer_hours ||
                                                          2,
                                                        onChange: (v) =>
                                                          updateConfig(
                                                            'timer_hours',
                                                            v
                                                          ),
                                                        min: 0,
                                                        max: 23,
                                                        output: true,
                                                      }
                                                    ),
                                                    /* @__PURE__ */ jsx2(
                                                      RangeSlider,
                                                      {
                                                        label: 'Minutes',
                                                        value:
                                                          config.timer_minutes ||
                                                          45,
                                                        onChange: (v) =>
                                                          updateConfig(
                                                            'timer_minutes',
                                                            v
                                                          ),
                                                        min: 0,
                                                        max: 59,
                                                        output: true,
                                                      }
                                                    ),
                                                    /* @__PURE__ */ jsx2(
                                                      RangeSlider,
                                                      {
                                                        label: 'Seconds',
                                                        value:
                                                          config.timer_seconds ||
                                                          12,
                                                        onChange: (v) =>
                                                          updateConfig(
                                                            'timer_seconds',
                                                            v
                                                          ),
                                                        min: 0,
                                                        max: 59,
                                                        output: true,
                                                      }
                                                    ),
                                                  ],
                                                }),
                                                /* @__PURE__ */ jsxs('div', {
                                                  style: { marginTop: 12 },
                                                  children: [
                                                    /* @__PURE__ */ jsx2(
                                                      Checkbox,
                                                      {
                                                        label:
                                                          'Auto Reset Timer on Expiry',
                                                        checked:
                                                          !!config.auto_reset_timer,
                                                        onChange: (v) =>
                                                          updateConfig(
                                                            'auto_reset_timer',
                                                            v
                                                          ),
                                                      }
                                                    ),
                                                    /* @__PURE__ */ jsx2(
                                                      Checkbox,
                                                      {
                                                        label:
                                                          'Change Bundle on Timer End',
                                                        checked:
                                                          !!config.change_bundle_on_timer_end,
                                                        onChange: (v) =>
                                                          updateConfig(
                                                            'change_bundle_on_timer_end',
                                                            v
                                                          ),
                                                      }
                                                    ),
                                                  ],
                                                }),
                                                (config.change_bundle_on_timer_end ||
                                                  config.auto_reset_timer) &&
                                                  /* @__PURE__ */ jsxs('div', {
                                                    style: { marginTop: 12 },
                                                    children: [
                                                      /* @__PURE__ */ jsx2(
                                                        TextField,
                                                        {
                                                          label:
                                                            'Bundle Titles (CSV)',
                                                          value:
                                                            config.bundle_titles ||
                                                            '',
                                                          onChange: (v) =>
                                                            updateConfig(
                                                              'bundle_titles',
                                                              v
                                                            ),
                                                          autoComplete: 'off',
                                                          helpText:
                                                            'Alternative titles for rotation (e.g. Mega Deal, Super Offer)',
                                                        }
                                                      ),
                                                      /* @__PURE__ */ jsx2(
                                                        TextField,
                                                        {
                                                          label:
                                                            'Bundle Subtitles (CSV)',
                                                          value:
                                                            config.bundle_subtitles ||
                                                            '',
                                                          onChange: (v) =>
                                                            updateConfig(
                                                              'bundle_subtitles',
                                                              v
                                                            ),
                                                          autoComplete: 'off',
                                                          helpText:
                                                            'Alternative subtitles for rotation',
                                                        }
                                                      ),
                                                    ],
                                                  }),
                                              ],
                                            }),
                                          ],
                                        }),
                                    ],
                                  }),
                                }),
                                /* @__PURE__ */ jsx2(CollapsibleCard, {
                                  title: 'Pricing & Discounts',
                                  expanded: expandedSections.pricing,
                                  onToggle: () => toggleSection('pricing'),
                                  children: /* @__PURE__ */ jsxs(FormLayout, {
                                    children: [
                                      /* @__PURE__ */ jsx2(RangeSlider, {
                                        label: 'Discount Percentage',
                                        value: config.discount_percentage || 20,
                                        onChange: (v) =>
                                          updateConfig(
                                            'discount_percentage',
                                            v
                                          ),
                                        min: 0,
                                        max: 50,
                                        step: 5,
                                        output: true,
                                        suffix: '%',
                                      }),
                                      /* @__PURE__ */ jsx2(Checkbox, {
                                        label: 'Show Preview Bar',
                                        checked:
                                          config.show_preview_bar !== false,
                                        onChange: (v) =>
                                          updateConfig('show_preview_bar', v),
                                        helpText:
                                          'Display product preview bar with images and pricing',
                                      }),
                                    ],
                                  }),
                                }),
                                /* @__PURE__ */ jsx2(CollapsibleCard, {
                                  title: 'Collections & Categories',
                                  expanded: expandedSections.collections,
                                  onToggle: () => toggleSection('collections'),
                                  children: /* @__PURE__ */ jsxs(FormLayout, {
                                    children: [
                                      /* @__PURE__ */ jsxs('div', {
                                        style: { marginBottom: 12 },
                                        children: [
                                          /* @__PURE__ */ jsx2(Text, {
                                            variant: 'headingSm',
                                            as: 'h6',
                                            children: 'Category Pills',
                                          }),
                                          /* @__PURE__ */ jsx2('p', {
                                            style: {
                                              fontSize: '13px',
                                              color: '#666',
                                              marginTop: '4px',
                                            },
                                            children:
                                              'Configure up to 4 category navigation pills',
                                          }),
                                        ],
                                      }),
                                      [1, 2, 3, 4].map((i) =>
                                        /* @__PURE__ */ jsxs(
                                          'div',
                                          {
                                            style: {
                                              display: 'flex',
                                              flexDirection: 'column',
                                              gap: '8px',
                                              padding: '10px',
                                              background: '#f4f6f8',
                                              borderRadius: '8px',
                                              marginBottom: '12px',
                                            },
                                            children: [
                                              /* @__PURE__ */ jsx2(Select, {
                                                label: `Category ${i} Collection`,
                                                options: [
                                                  {
                                                    label: '-- None --',
                                                    value: '',
                                                  },
                                                  ...(collections || []).map(
                                                    (col) => ({
                                                      label: col.title,
                                                      value: col.handle,
                                                    })
                                                  ),
                                                ],
                                                value: config[`col_${i}`] || '',
                                                onChange: (v) =>
                                                  updateConfig(`col_${i}`, v),
                                              }),
                                              /* @__PURE__ */ jsx2(TextField, {
                                                label: `Category ${i} Title`,
                                                value:
                                                  config[`title_${i}`] ||
                                                  (i === 1
                                                    ? 'All Packs'
                                                    : `Category ${i}`),
                                                onChange: (v) =>
                                                  updateConfig(`title_${i}`, v),
                                                autoComplete: 'off',
                                              }),
                                              /* @__PURE__ */ jsx2(TextField, {
                                                label: `Category ${i} Limit`,
                                                type: 'number',
                                                value: String(
                                                  config[`col_${i}_limit`] || 10
                                                ),
                                                onChange: (v) =>
                                                  updateConfig(
                                                    `col_${i}_limit`,
                                                    Math.max(1, Number(v))
                                                  ),
                                                helpText:
                                                  'Max items allowed from this category',
                                                autoComplete: 'off',
                                              }),
                                            ],
                                          },
                                          i
                                        )
                                      ),
                                    ],
                                  }),
                                }),
                                /* @__PURE__ */ jsx2(CollapsibleCard, {
                                  title: 'Colors & Branding',
                                  expanded: expandedSections.colors,
                                  onToggle: () => toggleSection('colors'),
                                  children: /* @__PURE__ */ jsxs(FormLayout, {
                                    children: [
                                      /* @__PURE__ */ jsxs('div', {
                                        style: {
                                          display: 'grid',
                                          gridTemplateColumns: '1fr 1fr',
                                          gap: '12px',
                                        },
                                        children: [
                                          /* @__PURE__ */ jsx2(
                                            ColorPickerField,
                                            {
                                              label: 'Primary Color',
                                              value:
                                                config.primary_color ||
                                                '#20D060',
                                              onChange: (v) =>
                                                updateConfig(
                                                  'primary_color',
                                                  v
                                                ),
                                            }
                                          ),
                                          /* @__PURE__ */ jsx2(
                                            ColorPickerField,
                                            {
                                              label: 'Text Color',
                                              value:
                                                config.text_color || '#111111',
                                              onChange: (v) =>
                                                updateConfig('text_color', v),
                                            }
                                          ),
                                        ],
                                      }),
                                      /* @__PURE__ */ jsx2(TextField, {
                                        label: 'Page Title',
                                        value:
                                          config.page_title ||
                                          'Value Combo Packs',
                                        onChange: (v) =>
                                          updateConfig('page_title', v),
                                        autoComplete: 'off',
                                      }),
                                    ],
                                  }),
                                }),
                              ],
                            }),
                          config.layout !== 'layout1' &&
                            config.layout !== 'layout2' &&
                            config.layout !== 'layout3' &&
                            /* @__PURE__ */ jsx2(CollapsibleCard, {
                              title: 'Collection',
                              expanded: expandedSections.general,
                              onToggle: () => toggleSection('general'),
                              children: /* @__PURE__ */ jsx2(FormLayout, {
                                children: /* @__PURE__ */ jsx2(Select, {
                                  label: 'Select Collection',
                                  options: [
                                    {
                                      label: '-- Choose a collection --',
                                      value: '',
                                    },
                                    ...(collections || []).map(
                                      (collection) => ({
                                        label: `${collection.title} (${collection.productsCount} products)`,
                                        value: collection.handle,
                                      })
                                    ),
                                  ],
                                  value: config.collection_handle || '',
                                  onChange: (v) =>
                                    updateConfig('collection_handle', v),
                                }),
                              }),
                            }),
                          /* @__PURE__ */ jsx2(CollapsibleCard, {
                            title: 'Banner Settings',
                            expanded: expandedSections.banner,
                            onToggle: () => toggleSection('banner'),
                            children: /* @__PURE__ */ jsxs(FormLayout, {
                              children: [
                                /* @__PURE__ */ jsx2(Checkbox, {
                                  label: 'Show Banner',
                                  checked: !!config.show_banner,
                                  onChange: (checked) =>
                                    updateConfig('show_banner', checked),
                                }),
                                config.show_banner &&
                                  /* @__PURE__ */ jsxs(Fragment, {
                                    children: [
                                      /* @__PURE__ */ jsxs('div', {
                                        style: {
                                          display: 'grid',
                                          gridTemplateColumns: '1fr',
                                          gap: '10px',
                                          marginBottom: '12px',
                                        },
                                        children: [
                                          /* @__PURE__ */ jsx2(TextField, {
                                            label: 'Desktop Banner Image URL',
                                            value: config.banner_image_url,
                                            onChange: (v) =>
                                              updateConfig(
                                                'banner_image_url',
                                                v
                                              ),
                                            autoComplete: 'off',
                                            placeholder:
                                              'https://example.com/desktop-banner.jpg',
                                          }),
                                          /* @__PURE__ */ jsx2(TextField, {
                                            label: 'Mobile Banner Image URL',
                                            value:
                                              config.banner_image_mobile_url,
                                            onChange: (v) =>
                                              updateConfig(
                                                'banner_image_mobile_url',
                                                v
                                              ),
                                            autoComplete: 'off',
                                            placeholder:
                                              'https://example.com/mobile-banner.jpg',
                                            helpText:
                                              'Leave empty to use desktop banner on mobile',
                                          }),
                                        ],
                                      }),
                                      /* @__PURE__ */ jsxs('div', {
                                        style: { marginBottom: '12px' },
                                        children: [
                                          /* @__PURE__ */ jsx2(Select, {
                                            label: 'Banner Fit Mode',
                                            options: [
                                              {
                                                label: 'Cover (Fill & Crop)',
                                                value: 'cover',
                                              },
                                              {
                                                label:
                                                  'Contain (Show Full Image)',
                                                value: 'contain',
                                              },
                                              {
                                                label:
                                                  'Adapt to Image (Natural Height)',
                                                value: 'adapt',
                                              },
                                            ],
                                            value:
                                              config.banner_fit_mode || 'cover',
                                            onChange: (v) =>
                                              updateConfig(
                                                'banner_fit_mode',
                                                v
                                              ),
                                          }),
                                          /* @__PURE__ */ jsx2('div', {
                                            style: { marginTop: '12px' },
                                            children: /* @__PURE__ */ jsx2(
                                              Checkbox,
                                              {
                                                label: 'Full Width',
                                                checked:
                                                  !!config.banner_full_width,
                                                onChange: (v) =>
                                                  updateConfig(
                                                    'banner_full_width',
                                                    v
                                                  ),
                                                helpText:
                                                  'Edge-to-edge ignoring container padding',
                                              }
                                            ),
                                          }),
                                        ],
                                      }),
                                      config.layout === 'layout2' &&
                                        /* @__PURE__ */ jsxs(Fragment, {
                                          children: [
                                            /* @__PURE__ */ jsx2(TextField, {
                                              label: 'Banner Title',
                                              value: config.banner_title || '',
                                              onChange: (v) =>
                                                updateConfig('banner_title', v),
                                              autoComplete: 'off',
                                            }),
                                            /* @__PURE__ */ jsx2(TextField, {
                                              label: 'Banner Subtitle',
                                              value:
                                                config.banner_subtitle || '',
                                              onChange: (v) =>
                                                updateConfig(
                                                  'banner_subtitle',
                                                  v
                                                ),
                                              autoComplete: 'off',
                                            }),
                                          ],
                                        }),
                                      config.layout === 'layout3' &&
                                        /* @__PURE__ */ jsxs(Fragment, {
                                          children: [
                                            /* @__PURE__ */ jsx2(TextField, {
                                              label:
                                                'Hero Image URL (Template 3)',
                                              value:
                                                config.hero_image_url || '',
                                              onChange: (v) =>
                                                updateConfig(
                                                  'hero_image_url',
                                                  v
                                                ),
                                              autoComplete: 'off',
                                              placeholder:
                                                'Hero image for Template 3',
                                            }),
                                            /* @__PURE__ */ jsx2(TextField, {
                                              label: 'Hero Title',
                                              value: config.hero_title || '',
                                              onChange: (v) =>
                                                updateConfig('hero_title', v),
                                              autoComplete: 'off',
                                            }),
                                            /* @__PURE__ */ jsxs('div', {
                                              style: { marginTop: 16 },
                                              children: [
                                                /* @__PURE__ */ jsx2(Checkbox, {
                                                  label:
                                                    'Enable Banner Slider (Rotates 3 images)',
                                                  checked:
                                                    !!config.enable_banner_slider,
                                                  onChange: (v) =>
                                                    updateConfig(
                                                      'enable_banner_slider',
                                                      v
                                                    ),
                                                }),
                                                config.enable_banner_slider &&
                                                  /* @__PURE__ */ jsxs('div', {
                                                    style: {
                                                      marginTop: 12,
                                                      padding: 12,
                                                      background: '#f9f9f9',
                                                      borderRadius: 8,
                                                    },
                                                    children: [
                                                      /* @__PURE__ */ jsx2(
                                                        RangeSlider,
                                                        {
                                                          label:
                                                            'Auto-Rotation Speed (Seconds)',
                                                          value:
                                                            config.slider_speed ||
                                                            5,
                                                          onChange: (v) =>
                                                            updateConfig(
                                                              'slider_speed',
                                                              v
                                                            ),
                                                          min: 2,
                                                          max: 15,
                                                          output: true,
                                                        }
                                                      ),
                                                      [1, 2, 3].map((i) =>
                                                        /* @__PURE__ */ jsxs(
                                                          'div',
                                                          {
                                                            style: {
                                                              marginTop: 12,
                                                              paddingTop: 12,
                                                              borderTop:
                                                                i > 1
                                                                  ? '1px solid #ddd'
                                                                  : 'none',
                                                            },
                                                            children: [
                                                              /* @__PURE__ */ jsxs(
                                                                Text,
                                                                {
                                                                  variant:
                                                                    'headingSm',
                                                                  as: 'h6',
                                                                  children: [
                                                                    'Banner ',
                                                                    i,
                                                                  ],
                                                                }
                                                              ),
                                                              /* @__PURE__ */ jsx2(
                                                                TextField,
                                                                {
                                                                  label:
                                                                    'Image URL',
                                                                  value:
                                                                    config[
                                                                      `banner_${i}_image`
                                                                    ],
                                                                  onChange: (
                                                                    v
                                                                  ) =>
                                                                    updateConfig(
                                                                      `banner_${i}_image`,
                                                                      v
                                                                    ),
                                                                  autoComplete:
                                                                    'off',
                                                                }
                                                              ),
                                                              /* @__PURE__ */ jsx2(
                                                                TextField,
                                                                {
                                                                  label:
                                                                    'Title',
                                                                  value:
                                                                    config[
                                                                      `banner_${i}_title`
                                                                    ],
                                                                  onChange: (
                                                                    v
                                                                  ) =>
                                                                    updateConfig(
                                                                      `banner_${i}_title`,
                                                                      v
                                                                    ),
                                                                  autoComplete:
                                                                    'off',
                                                                }
                                                              ),
                                                              /* @__PURE__ */ jsx2(
                                                                TextField,
                                                                {
                                                                  label:
                                                                    'Subtitle',
                                                                  value:
                                                                    config[
                                                                      `banner_${i}_subtitle`
                                                                    ],
                                                                  onChange: (
                                                                    v
                                                                  ) =>
                                                                    updateConfig(
                                                                      `banner_${i}_subtitle`,
                                                                      v
                                                                    ),
                                                                  autoComplete:
                                                                    'off',
                                                                }
                                                              ),
                                                            ],
                                                          },
                                                          i
                                                        )
                                                      ),
                                                    ],
                                                  }),
                                              ],
                                            }),
                                          ],
                                        }),
                                      /* @__PURE__ */ jsxs('div', {
                                        style: {
                                          borderTop: '1px solid #eee',
                                          paddingTop: '12px',
                                          marginTop: '8px',
                                        },
                                        children: [
                                          /* @__PURE__ */ jsx2(Text, {
                                            variant: 'headingSm',
                                            as: 'h6',
                                            children: 'Desktop Banner Sizing',
                                          }),
                                          /* @__PURE__ */ jsxs('div', {
                                            style: {
                                              display: 'grid',
                                              gridTemplateColumns: '1fr 1fr',
                                              gap: '12px',
                                              marginTop: '8px',
                                            },
                                            children: [
                                              /* @__PURE__ */ jsx2(PxField, {
                                                label: 'Width (%)',
                                                value:
                                                  config.banner_width_desktop,
                                                onChange: (v) =>
                                                  updateConfig(
                                                    'banner_width_desktop',
                                                    v
                                                  ),
                                                min: 0,
                                                max: 100,
                                                suffix: '%',
                                              }),
                                              /* @__PURE__ */ jsx2(PxField, {
                                                label: 'Height (px)',
                                                value:
                                                  config.banner_height_desktop,
                                                onChange: (v) =>
                                                  updateConfig(
                                                    'banner_height_desktop',
                                                    v
                                                  ),
                                                suffix: 'px',
                                              }),
                                            ],
                                          }),
                                        ],
                                      }),
                                      /* @__PURE__ */ jsxs('div', {
                                        style: {
                                          borderTop: '1px solid #eee',
                                          paddingTop: '12px',
                                          marginTop: '12px',
                                        },
                                        children: [
                                          /* @__PURE__ */ jsx2(Text, {
                                            variant: 'headingSm',
                                            as: 'h6',
                                            children: 'Mobile Banner Sizing',
                                          }),
                                          /* @__PURE__ */ jsxs('div', {
                                            style: {
                                              display: 'grid',
                                              gridTemplateColumns: '1fr 1fr',
                                              gap: '12px',
                                              marginTop: '8px',
                                            },
                                            children: [
                                              /* @__PURE__ */ jsx2(PxField, {
                                                label: 'Width (%)',
                                                value:
                                                  config.banner_width_mobile ||
                                                  config.banner_width_desktop,
                                                onChange: (v) =>
                                                  updateConfig(
                                                    'banner_width_mobile',
                                                    v
                                                  ),
                                                min: 0,
                                                max: 100,
                                                suffix: '%',
                                              }),
                                              /* @__PURE__ */ jsx2(PxField, {
                                                label: 'Height (px)',
                                                value:
                                                  config.banner_height_mobile ||
                                                  config.banner_height_desktop,
                                                onChange: (v) =>
                                                  updateConfig(
                                                    'banner_height_mobile',
                                                    v
                                                  ),
                                                suffix: 'px',
                                              }),
                                            ],
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                              ],
                            }),
                          }),
                          /* @__PURE__ */ jsx2(CollapsibleCard, {
                            title: 'Products & Grid',
                            expanded: expandedSections.products,
                            onToggle: () => toggleSection('products'),
                            children: /* @__PURE__ */ jsxs(FormLayout, {
                              children: [
                                /* @__PURE__ */ jsx2(Checkbox, {
                                  label: 'Show product grid',
                                  checked: !!config.show_products_grid,
                                  onChange: (checked) =>
                                    updateConfig('show_products_grid', checked),
                                }),
                                /* @__PURE__ */ jsx2(PxField, {
                                  label: 'Product Grid Width (%)',
                                  value: config.grid_width,
                                  onChange: (v) =>
                                    updateConfig('grid_width', v),
                                  min: 10,
                                  max: 100,
                                  suffix: '%',
                                  helpText:
                                    'Adjust the overall width of the product grid',
                                }),
                                config.show_products_grid &&
                                  /* @__PURE__ */ jsxs('div', {
                                    style: {
                                      display: 'grid',
                                      gridTemplateColumns: '1fr 1fr',
                                      gap: 10,
                                    },
                                    children: [
                                      /* @__PURE__ */ jsx2(Select, {
                                        label: 'Desktop Columns',
                                        options: [
                                          { label: '2', value: '2' },
                                          { label: '3', value: '3' },
                                          { label: '4', value: '4' },
                                        ],
                                        value: config.desktop_columns,
                                        onChange: (v) =>
                                          updateConfig('desktop_columns', v),
                                      }),
                                      /* @__PURE__ */ jsx2(Select, {
                                        label: 'Layout Type',
                                        options: [
                                          { label: 'Grid', value: 'grid' },
                                          { label: 'Slider', value: 'slider' },
                                        ],
                                        value: config.grid_layout_type,
                                        onChange: (v) =>
                                          updateConfig('grid_layout_type', v),
                                      }),
                                      /* @__PURE__ */ jsx2(Select, {
                                        label: 'Mobile Columns',
                                        options: [
                                          { label: '1', value: '1' },
                                          { label: '2', value: '2' },
                                        ],
                                        value: config.mobile_columns,
                                        onChange: (v) =>
                                          updateConfig('mobile_columns', v),
                                      }),
                                      /* @__PURE__ */ jsx2(PxField, {
                                        label: 'Image Height (D)',
                                        value:
                                          config.product_image_height_desktop,
                                        onChange: (v) =>
                                          updateConfig(
                                            'product_image_height_desktop',
                                            v
                                          ),
                                      }),
                                      /* @__PURE__ */ jsx2(PxField, {
                                        label: 'Image Height (M)',
                                        value:
                                          config.product_image_height_mobile,
                                        onChange: (v) =>
                                          updateConfig(
                                            'product_image_height_mobile',
                                            v
                                          ),
                                      }),
                                    ],
                                  }),
                              ],
                            }),
                          }),
                        ],
                      }),
                    activeCategory === 'style' &&
                      /* @__PURE__ */ jsxs(Fragment, {
                        children: [
                          /* @__PURE__ */ jsx2(CollapsibleCard, {
                            title: 'Title & Description',
                            expanded: expandedSections.content,
                            onToggle: () => toggleSection('content'),
                            children: /* @__PURE__ */ jsxs(FormLayout, {
                              children: [
                                /* @__PURE__ */ jsx2(Checkbox, {
                                  label: 'Show title & description',
                                  checked: !!config.show_title_description,
                                  onChange: (checked) =>
                                    updateConfig(
                                      'show_title_description',
                                      checked
                                    ),
                                }),
                                config.show_title_description &&
                                  /* @__PURE__ */ jsxs('div', {
                                    style: {
                                      display: 'grid',
                                      gridTemplateColumns: '1fr',
                                      gap: 10,
                                    },
                                    children: [
                                      config.layout === 'layout2' &&
                                        /* @__PURE__ */ jsx2(TextField, {
                                          label: 'Header Title (Sticky Top)',
                                          value: config.header_title || '',
                                          onChange: (v) =>
                                            updateConfig('header_title', v),
                                          autoComplete: 'off',
                                        }),
                                      /* @__PURE__ */ jsx2('div', {
                                        style: { paddingBottom: '12px' },
                                        children: /* @__PURE__ */ jsx2(
                                          TextField,
                                          {
                                            label: 'Collection Title',
                                            value: config.collection_title,
                                            onChange: (v) =>
                                              updateConfig(
                                                'collection_title',
                                                v
                                              ),
                                          }
                                        ),
                                      }),
                                      /* @__PURE__ */ jsxs('div', {
                                        style: {
                                          marginBottom: 12,
                                          paddingTop: 8,
                                          borderTop: '1px solid #e1e3e5',
                                        },
                                        children: [
                                          /* @__PURE__ */ jsx2(Text, {
                                            variant: 'headingSm',
                                            as: 'h6',
                                            style: { marginBottom: 8 },
                                            children: 'Title Styling',
                                          }),
                                          /* @__PURE__ */ jsxs('div', {
                                            style: {
                                              display: 'grid',
                                              gridTemplateColumns: '1fr',
                                              gap: 10,
                                            },
                                            children: [
                                              /* @__PURE__ */ jsx2(Select, {
                                                label: 'Title Alignment',
                                                options: [
                                                  {
                                                    label: 'Left',
                                                    value: 'left',
                                                  },
                                                  {
                                                    label: 'Center',
                                                    value: 'center',
                                                  },
                                                  {
                                                    label: 'Right',
                                                    value: 'right',
                                                  },
                                                ],
                                                value:
                                                  config.heading_align ||
                                                  'left',
                                                onChange: (v) =>
                                                  updateConfig(
                                                    'heading_align',
                                                    v
                                                  ),
                                              }),
                                              /* @__PURE__ */ jsx2(Select, {
                                                label: 'Title Font Weight',
                                                options: [
                                                  {
                                                    label: 'Normal (400)',
                                                    value: '400',
                                                  },
                                                  {
                                                    label: 'Medium (500)',
                                                    value: '500',
                                                  },
                                                  {
                                                    label: 'Semi-Bold (600)',
                                                    value: '600',
                                                  },
                                                  {
                                                    label: 'Bold (700)',
                                                    value: '700',
                                                  },
                                                  {
                                                    label: 'Extra Bold (800)',
                                                    value: '800',
                                                  },
                                                ],
                                                value: String(
                                                  config.heading_font_weight ||
                                                    '700'
                                                ),
                                                onChange: (v) =>
                                                  updateConfig(
                                                    'heading_font_weight',
                                                    v
                                                  ),
                                              }),
                                              /* @__PURE__ */ jsx2(PxField, {
                                                label: 'Title Size',
                                                value: config.heading_size,
                                                onChange: (v) =>
                                                  updateConfig(
                                                    'heading_size',
                                                    v
                                                  ),
                                              }),
                                              /* @__PURE__ */ jsx2(
                                                ColorPickerField,
                                                {
                                                  label: 'Title Color',
                                                  value: config.heading_color,
                                                  onChange: (v) =>
                                                    updateConfig(
                                                      'heading_color',
                                                      v
                                                    ),
                                                }
                                              ),
                                            ],
                                          }),
                                          /* @__PURE__ */ jsxs('div', {
                                            style: { marginTop: 12 },
                                            children: [
                                              /* @__PURE__ */ jsx2(Text, {
                                                variant: 'bodySm',
                                                as: 'span',
                                                style: { fontWeight: 500 },
                                                children: 'Title Padding (px)',
                                              }),
                                              /* @__PURE__ */ jsxs('div', {
                                                style: {
                                                  display: 'grid',
                                                  gridTemplateColumns: '1fr',
                                                  gap: 12,
                                                  marginTop: 6,
                                                  width: '100%',
                                                },
                                                children: [
                                                  /* @__PURE__ */ jsx2(
                                                    PxField,
                                                    {
                                                      label: 'Top',
                                                      value:
                                                        config.title_container_padding_top,
                                                      onChange: (v) =>
                                                        updateConfig(
                                                          'title_container_padding_top',
                                                          v
                                                        ),
                                                      style: {
                                                        minWidth: 80,
                                                        textAlign: 'center',
                                                        fontWeight: 700,
                                                        fontSize: 16,
                                                        border:
                                                          '1px solid #ccc',
                                                        borderRadius: 4,
                                                        padding: 4,
                                                      },
                                                    }
                                                  ),
                                                  /* @__PURE__ */ jsx2(
                                                    PxField,
                                                    {
                                                      label: 'Right',
                                                      value:
                                                        config.title_container_padding_right,
                                                      onChange: (v) =>
                                                        updateConfig(
                                                          'title_container_padding_right',
                                                          v
                                                        ),
                                                      style: {
                                                        minWidth: 80,
                                                        textAlign: 'center',
                                                        fontWeight: 700,
                                                        fontSize: 16,
                                                        border:
                                                          '1px solid #ccc',
                                                        borderRadius: 4,
                                                        padding: 4,
                                                      },
                                                    }
                                                  ),
                                                  /* @__PURE__ */ jsx2(
                                                    PxField,
                                                    {
                                                      label: 'Bottom',
                                                      value:
                                                        config.title_container_padding_bottom,
                                                      onChange: (v) =>
                                                        updateConfig(
                                                          'title_container_padding_bottom',
                                                          v
                                                        ),
                                                      style: {
                                                        minWidth: 80,
                                                        textAlign: 'center',
                                                        fontWeight: 700,
                                                        fontSize: 16,
                                                        border:
                                                          '1px solid #ccc',
                                                        borderRadius: 4,
                                                        padding: 4,
                                                      },
                                                    }
                                                  ),
                                                  /* @__PURE__ */ jsx2(
                                                    PxField,
                                                    {
                                                      label: 'Left',
                                                      value:
                                                        config.title_container_padding_left,
                                                      onChange: (v) =>
                                                        updateConfig(
                                                          'title_container_padding_left',
                                                          v
                                                        ),
                                                      style: {
                                                        minWidth: 80,
                                                        textAlign: 'center',
                                                        fontWeight: 700,
                                                        fontSize: 16,
                                                        border:
                                                          '1px solid #ccc',
                                                        borderRadius: 4,
                                                        padding: 4,
                                                      },
                                                    }
                                                  ),
                                                ],
                                              }),
                                            ],
                                          }),
                                        ],
                                      }),
                                      /* @__PURE__ */ jsx2('div', {
                                        style: { height: '24px' },
                                      }),
                                      /* @__PURE__ */ jsx2('div', {
                                        style: { paddingBottom: '12px' },
                                        children: /* @__PURE__ */ jsx2(
                                          TextField,
                                          {
                                            label: 'Collection Description',
                                            value:
                                              config.collection_description,
                                            onChange: (v) =>
                                              updateConfig(
                                                'collection_description',
                                                v
                                              ),
                                            multiline: 3,
                                          }
                                        ),
                                      }),
                                      /* @__PURE__ */ jsxs('div', {
                                        style: {
                                          marginBottom: 12,
                                          paddingTop: 8,
                                          borderTop: '1px solid #e1e3e5',
                                        },
                                        children: [
                                          /* @__PURE__ */ jsx2(Text, {
                                            variant: 'headingSm',
                                            as: 'h6',
                                            style: { marginBottom: 8 },
                                            children: 'Description Styling',
                                          }),
                                          /* @__PURE__ */ jsxs('div', {
                                            style: {
                                              display: 'grid',
                                              gridTemplateColumns: '1fr',
                                              gap: 10,
                                            },
                                            children: [
                                              /* @__PURE__ */ jsx2(Select, {
                                                label: 'Description Alignment',
                                                options: [
                                                  {
                                                    label: 'Left',
                                                    value: 'left',
                                                  },
                                                  {
                                                    label: 'Center',
                                                    value: 'center',
                                                  },
                                                  {
                                                    label: 'Right',
                                                    value: 'right',
                                                  },
                                                ],
                                                value:
                                                  config.description_align ||
                                                  'left',
                                                onChange: (v) =>
                                                  updateConfig(
                                                    'description_align',
                                                    v
                                                  ),
                                              }),
                                              /* @__PURE__ */ jsx2(Select, {
                                                label:
                                                  'Description Font Weight',
                                                options: [
                                                  {
                                                    label: 'Light (300)',
                                                    value: '300',
                                                  },
                                                  {
                                                    label: 'Normal (400)',
                                                    value: '400',
                                                  },
                                                  {
                                                    label: 'Medium (500)',
                                                    value: '500',
                                                  },
                                                  {
                                                    label: 'Semi-Bold (600)',
                                                    value: '600',
                                                  },
                                                  {
                                                    label: 'Bold (700)',
                                                    value: '700',
                                                  },
                                                ],
                                                value: String(
                                                  config.description_font_weight ||
                                                    '400'
                                                ),
                                                onChange: (v) =>
                                                  updateConfig(
                                                    'description_font_weight',
                                                    v
                                                  ),
                                              }),
                                              /* @__PURE__ */ jsx2(PxField, {
                                                label: 'Description Size',
                                                value: config.description_size,
                                                onChange: (v) =>
                                                  updateConfig(
                                                    'description_size',
                                                    v
                                                  ),
                                              }),
                                              /* @__PURE__ */ jsx2(
                                                ColorPickerField,
                                                {
                                                  label: 'Description Color',
                                                  value:
                                                    config.description_color,
                                                  onChange: (v) =>
                                                    updateConfig(
                                                      'description_color',
                                                      v
                                                    ),
                                                }
                                              ),
                                            ],
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                              ],
                            }),
                          }),
                          /* @__PURE__ */ jsx2(CollapsibleCard, {
                            title: 'Product Card',
                            expanded: expandedSections.productCard,
                            onToggle: () => toggleSection('productCard'),
                            children: /* @__PURE__ */ jsx2(FormLayout, {
                              children: /* @__PURE__ */ jsxs('div', {
                                style: {
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 1fr',
                                  gap: 10,
                                },
                                children: [
                                  /* @__PURE__ */ jsx2(ColorPickerField, {
                                    label: 'Highlight Color',
                                    value: config.selection_highlight_color,
                                    onChange: (v) =>
                                      updateConfig(
                                        'selection_highlight_color',
                                        v
                                      ),
                                  }),
                                  /* @__PURE__ */ jsx2('div', {
                                    style: { paddingTop: '20px' },
                                    children: /* @__PURE__ */ jsx2(Checkbox, {
                                      label: 'Show Tick on Selected',
                                      checked: !!config.show_selection_tick,
                                      onChange: (v) =>
                                        updateConfig('show_selection_tick', v),
                                    }),
                                  }),
                                ],
                              }),
                            }),
                          }),
                          /* @__PURE__ */ jsx2(CollapsibleCard, {
                            title: 'Variants & Actions',
                            expanded: expandedSections.variants,
                            onToggle: () => toggleSection('variants'),
                            children: /* @__PURE__ */ jsxs(FormLayout, {
                              children: [
                                /* @__PURE__ */ jsx2(Select, {
                                  label: 'Variant Display',
                                  options: [
                                    { label: 'Hover Popup', value: 'hover' },
                                    {
                                      label: 'Static Inside Card',
                                      value: 'static',
                                    },
                                    {
                                      label: 'Selection Popup (Bottom)',
                                      value: 'popup',
                                    },
                                  ],
                                  value: config.product_card_variants_display,
                                  onChange: (v) =>
                                    updateConfig(
                                      'product_card_variants_display',
                                      v
                                    ),
                                }),
                                /* @__PURE__ */ jsxs('div', {
                                  style: {
                                    display: 'flex',
                                    gap: '10px',
                                    marginTop: '8px',
                                  },
                                  children: [
                                    /* @__PURE__ */ jsx2(Checkbox, {
                                      label: 'Quantity Selector',
                                      checked: !!config.show_quantity_selector,
                                      onChange: (v) =>
                                        updateConfig(
                                          'show_quantity_selector',
                                          v
                                        ),
                                    }),
                                    /* @__PURE__ */ jsx2(Checkbox, {
                                      label: 'Add to Cart Button',
                                      checked: !!config.show_add_to_cart_btn,
                                      onChange: (v) =>
                                        updateConfig('show_add_to_cart_btn', v),
                                    }),
                                  ],
                                }),
                              ],
                            }),
                          }),
                          /* @__PURE__ */ jsx2(CollapsibleCard, {
                            title: 'Button Customization',
                            expanded: expandedSections.buttonCustomization,
                            onToggle: () =>
                              toggleSection('buttonCustomization'),
                            children: /* @__PURE__ */ jsxs(FormLayout, {
                              children: [
                                /* @__PURE__ */ jsx2(Text, {
                                  variant: 'headingSm',
                                  as: 'h6',
                                  children: 'Add Button',
                                }),
                                /* @__PURE__ */ jsxs('div', {
                                  style: {
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: 10,
                                  },
                                  children: [
                                    /* @__PURE__ */ jsx2(TextField, {
                                      label: 'Text',
                                      value: config.add_btn_text,
                                      onChange: (v) =>
                                        updateConfig('add_btn_text', v),
                                    }),
                                    /* @__PURE__ */ jsx2(ColorPickerField, {
                                      label: 'Background',
                                      value: config.add_btn_bg,
                                      onChange: (v) =>
                                        updateConfig('add_btn_bg', v),
                                    }),
                                    /* @__PURE__ */ jsx2(ColorPickerField, {
                                      label: 'Text Color',
                                      value: config.add_btn_text_color,
                                      onChange: (v) =>
                                        updateConfig('add_btn_text_color', v),
                                    }),
                                  ],
                                }),
                                /* @__PURE__ */ jsxs('div', {
                                  style: {
                                    marginTop: 12,
                                    paddingTop: 12,
                                    borderTop: '1px solid #eee',
                                  },
                                  children: [
                                    /* @__PURE__ */ jsx2(Text, {
                                      variant: 'headingSm',
                                      as: 'h6',
                                      children: 'Checkout / Preview Button',
                                    }),
                                    /* @__PURE__ */ jsx2(TextField, {
                                      label: 'Text',
                                      value: config.checkout_btn_text,
                                      onChange: (v) =>
                                        updateConfig('checkout_btn_text', v),
                                    }),
                                    /* @__PURE__ */ jsxs('div', {
                                      style: {
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 10,
                                        marginTop: 8,
                                      },
                                      children: [
                                        /* @__PURE__ */ jsx2(ColorPickerField, {
                                          label: 'Background (Main)',
                                          value: config.checkout_btn_bg,
                                          onChange: (v) =>
                                            updateConfig('checkout_btn_bg', v),
                                        }),
                                        /* @__PURE__ */ jsx2(ColorPickerField, {
                                          label: 'Text Color (Main)',
                                          value: config.checkout_btn_text_color,
                                          onChange: (v) =>
                                            updateConfig(
                                              'checkout_btn_text_color',
                                              v
                                            ),
                                        }),
                                        /* @__PURE__ */ jsx2(ColorPickerField, {
                                          label: 'Preview Btn Bg (Layout 4)',
                                          value: config.preview_bar_button_bg,
                                          onChange: (v) =>
                                            updateConfig(
                                              'preview_bar_button_bg',
                                              v
                                            ),
                                        }),
                                        /* @__PURE__ */ jsx2(ColorPickerField, {
                                          label: 'Preview Btn Text (Layout 4)',
                                          value: config.preview_bar_button_text,
                                          onChange: (v) =>
                                            updateConfig(
                                              'preview_bar_button_text',
                                              v
                                            ),
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                              ],
                            }),
                          }),
                          /* @__PURE__ */ jsx2(CollapsibleCard, {
                            title: 'Sticky Preview Bar',
                            expanded: expandedSections.previewBar,
                            onToggle: () => toggleSection('previewBar'),
                            children: /* @__PURE__ */ jsxs(FormLayout, {
                              children: [
                                /* @__PURE__ */ jsx2(Checkbox, {
                                  label: 'Show Bottom Sticky Bar',
                                  checked: !!config.show_sticky_preview_bar,
                                  onChange: (checked) =>
                                    updateConfig(
                                      'show_sticky_preview_bar',
                                      checked
                                    ),
                                }),
                                /* @__PURE__ */ jsx2(Checkbox, {
                                  label: 'Full width sticky preview bar',
                                  checked:
                                    !!config.sticky_preview_bar_full_width,
                                  onChange: (checked) =>
                                    updateConfig(
                                      'sticky_preview_bar_full_width',
                                      checked
                                    ),
                                }),
                                config.show_sticky_preview_bar &&
                                  /* @__PURE__ */ jsxs(Fragment, {
                                    children: [
                                      /* @__PURE__ */ jsxs('div', {
                                        style: {
                                          display: 'grid',
                                          gridTemplateColumns: '1fr 1fr',
                                          gap: 10,
                                        },
                                        children: [
                                          /* @__PURE__ */ jsx2(
                                            ColorPickerField,
                                            {
                                              label: 'Background',
                                              value:
                                                config.sticky_preview_bar_bg,
                                              onChange: (v) =>
                                                updateConfig(
                                                  'sticky_preview_bar_bg',
                                                  v
                                                ),
                                            }
                                          ),
                                          /* @__PURE__ */ jsx2(
                                            ColorPickerField,
                                            {
                                              label: 'Text',
                                              value:
                                                config.sticky_preview_bar_text_color,
                                              onChange: (v) =>
                                                updateConfig(
                                                  'sticky_preview_bar_text_color',
                                                  v
                                                ),
                                            }
                                          ),
                                        ],
                                      }),
                                      /* @__PURE__ */ jsx2(PxField, {
                                        label: 'Width (%)',
                                        value: config.sticky_preview_bar_width,
                                        onChange: (v) =>
                                          updateConfig(
                                            'sticky_preview_bar_width',
                                            v
                                          ),
                                        min: 0,
                                        max: 100,
                                        suffix: '%',
                                      }),
                                      /* @__PURE__ */ jsx2(PxField, {
                                        label: 'Height (px)',
                                        value: config.sticky_preview_bar_height,
                                        onChange: (v) =>
                                          updateConfig(
                                            'sticky_preview_bar_height',
                                            v
                                          ),
                                        min: 40,
                                        max: 200,
                                        suffix: 'px',
                                      }),
                                      /* @__PURE__ */ jsx2(PxField, {
                                        label: 'Padding (px)',
                                        value:
                                          config.sticky_preview_bar_padding,
                                        onChange: (v) =>
                                          updateConfig(
                                            'sticky_preview_bar_padding',
                                            v
                                          ),
                                        min: 0,
                                        max: 80,
                                        suffix: 'px',
                                      }),
                                    ],
                                  }),
                              ],
                            }),
                          }),
                          /* @__PURE__ */ jsx2(CollapsibleCard, {
                            title: 'Inline Preview Bar',
                            expanded: expandedSections.inlinePreviewBar,
                            onToggle: () => toggleSection('inlinePreviewBar'),
                            children: /* @__PURE__ */ jsxs(FormLayout, {
                              children: [
                                /* @__PURE__ */ jsx2(Checkbox, {
                                  label: 'Show Inline Preview Bar',
                                  checked: !!config.show_preview_bar,
                                  onChange: (checked) =>
                                    updateConfig('show_preview_bar', checked),
                                }),
                                /* @__PURE__ */ jsx2(PxField, {
                                  label: 'Inline Preview Bar Width (%)',
                                  value: config.preview_bar_width,
                                  onChange: (v) =>
                                    updateConfig('preview_bar_width', v),
                                  min: 10,
                                  max: 100,
                                  suffix: '%',
                                  helpText:
                                    'Set to 100% for full width, or adjust as needed.',
                                }),
                                config.show_preview_bar &&
                                  /* @__PURE__ */ jsxs(Fragment, {
                                    children: [
                                      /* @__PURE__ */ jsxs('div', {
                                        style: {
                                          display: 'grid',
                                          gridTemplateColumns: '1fr 1fr',
                                          gap: 10,
                                        },
                                        children: [
                                          /* @__PURE__ */ jsx2(
                                            ColorPickerField,
                                            {
                                              label: 'Background',
                                              value: config.preview_bar_bg,
                                              onChange: (v) =>
                                                updateConfig(
                                                  'preview_bar_bg',
                                                  v
                                                ),
                                            }
                                          ),
                                          /* @__PURE__ */ jsx2(
                                            ColorPickerField,
                                            {
                                              label: 'Text',
                                              value:
                                                config.preview_bar_text_color,
                                              onChange: (v) =>
                                                updateConfig(
                                                  'preview_bar_text_color',
                                                  v
                                                ),
                                            }
                                          ),
                                        ],
                                      }),
                                      /* @__PURE__ */ jsx2(PxField, {
                                        label: 'Width (%)',
                                        value: config.preview_bar_width,
                                        onChange: (v) =>
                                          updateConfig('preview_bar_width', v),
                                        min: 0,
                                        max: 100,
                                        suffix: '%',
                                      }),
                                      /* @__PURE__ */ jsx2(PxField, {
                                        label: 'Height (px)',
                                        value: config.preview_bar_height,
                                        onChange: (v) =>
                                          updateConfig('preview_bar_height', v),
                                        min: 40,
                                        max: 200,
                                        suffix: 'px',
                                      }),
                                      /* @__PURE__ */ jsx2(PxField, {
                                        label: 'Padding (px)',
                                        value: config.preview_bar_padding,
                                        onChange: (v) =>
                                          updateConfig(
                                            'preview_bar_padding',
                                            v
                                          ),
                                        min: 0,
                                        max: 80,
                                        suffix: 'px',
                                      }),
                                      /* @__PURE__ */ jsxs('div', {
                                        style: {
                                          display: 'grid',
                                          gridTemplateColumns: '1fr 1fr',
                                          gap: 10,
                                        },
                                        children: [
                                          /* @__PURE__ */ jsx2(PxField, {
                                            label: 'Original Price Size',
                                            value: config.original_price_size,
                                            onChange: (v) =>
                                              updateConfig(
                                                'original_price_size',
                                                v
                                              ),
                                            min: 10,
                                            max: 40,
                                          }),
                                          /* @__PURE__ */ jsx2(PxField, {
                                            label: 'Discounted Price Size',
                                            value: config.discounted_price_size,
                                            onChange: (v) =>
                                              updateConfig(
                                                'discounted_price_size',
                                                v
                                              ),
                                            min: 10,
                                            max: 40,
                                          }),
                                        ],
                                      }),
                                      /* @__PURE__ */ jsx2(Select, {
                                        label: 'Preview Bar Shape',
                                        options: [
                                          {
                                            label: 'Rectangle',
                                            value: 'rectangle',
                                          },
                                          { label: 'Circle', value: 'circle' },
                                        ],
                                        value:
                                          config.preview_item_shape ||
                                          'rectangle',
                                        onChange: (v) =>
                                          updateConfig('preview_item_shape', v),
                                      }),
                                      /* @__PURE__ */ jsx2(PxField, {
                                        label: 'Shape Size (px)',
                                        value: config.preview_item_size,
                                        onChange: (v) =>
                                          updateConfig('preview_item_size', v),
                                        min: 24,
                                        max: 120,
                                        suffix: 'px',
                                      }),
                                      /* @__PURE__ */ jsx2(PxField, {
                                        label: 'Shape Padding (px)',
                                        value: config.preview_item_padding,
                                        onChange: (v) =>
                                          updateConfig(
                                            'preview_item_padding',
                                            v
                                          ),
                                        min: 0,
                                        max: 40,
                                        suffix: 'px',
                                      }),
                                      /* @__PURE__ */ jsx2(ColorPickerField, {
                                        label: 'Shape Color',
                                        value: config.preview_item_color,
                                        onChange: (v) =>
                                          updateConfig('preview_item_color', v),
                                      }),
                                      /* @__PURE__ */ jsx2(ColorPickerField, {
                                        label: 'Shape Border Color',
                                        value: config.preview_item_border_color,
                                        onChange: (v) =>
                                          updateConfig(
                                            'preview_item_border_color',
                                            v
                                          ),
                                      }),
                                    ],
                                  }),
                              ],
                            }),
                          }),
                          /* @__PURE__ */ jsx2(CollapsibleCard, {
                            title: 'Style & Spacing',
                            expanded: expandedSections.styles,
                            onToggle: () => toggleSection('styles'),
                            children: /* @__PURE__ */ jsxs(FormLayout, {
                              children: [
                                /* @__PURE__ */ jsxs('div', {
                                  style: { marginBottom: '12px' },
                                  children: [
                                    /* @__PURE__ */ jsx2(Text, {
                                      variant: 'headingSm',
                                      as: 'h6',
                                      children: 'Container Padding',
                                    }),
                                    /* @__PURE__ */ jsxs('div', {
                                      style: {
                                        marginBottom: 12,
                                        paddingBottom: 12,
                                        borderBottom: '1px solid #eee',
                                      },
                                      children: [
                                        /* @__PURE__ */ jsx2(Text, {
                                          variant: 'headingSm',
                                          as: 'h6',
                                          style: { marginBottom: 8 },
                                          children: 'Width Control (%)',
                                        }),
                                        /* @__PURE__ */ jsxs('div', {
                                          style: {
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr 1fr',
                                            gap: 10,
                                          },
                                          children: [
                                            /* @__PURE__ */ jsx2(PxField, {
                                              label: 'Container',
                                              value: config.container_width,
                                              onChange: (v) =>
                                                updateConfig(
                                                  'container_width',
                                                  v
                                                ),
                                              min: 50,
                                              max: 100,
                                              suffix: '%',
                                            }),
                                            /* @__PURE__ */ jsx2(PxField, {
                                              label: 'Title',
                                              value: config.title_width,
                                              onChange: (v) =>
                                                updateConfig('title_width', v),
                                              min: 20,
                                              max: 100,
                                              suffix: '%',
                                            }),
                                            /* @__PURE__ */ jsx2(PxField, {
                                              label: 'Banner',
                                              value: config.banner_width,
                                              onChange: (v) =>
                                                updateConfig('banner_width', v),
                                              min: 20,
                                              max: 100,
                                              suffix: '%',
                                            }),
                                          ],
                                        }),
                                      ],
                                    }),
                                    /* @__PURE__ */ jsxs('div', {
                                      style: {
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 10,
                                      },
                                      children: [
                                        /* @__PURE__ */ jsx2(PxField, {
                                          label: 'D Vertical',
                                          value:
                                            config.container_padding_top_desktop,
                                          onChange: (v) =>
                                            updateBoth(
                                              'container_padding_top_desktop',
                                              'container_padding_bottom_desktop',
                                              v
                                            ),
                                        }),
                                        /* @__PURE__ */ jsx2(PxField, {
                                          label: 'D Horizontal',
                                          value:
                                            config.container_padding_left_desktop,
                                          onChange: (v) =>
                                            updateBoth(
                                              'container_padding_left_desktop',
                                              'container_padding_right_desktop',
                                              v
                                            ),
                                        }),
                                        /* @__PURE__ */ jsx2(PxField, {
                                          label: 'M Vertical',
                                          value:
                                            config.container_padding_top_mobile,
                                          onChange: (v) =>
                                            updateBoth(
                                              'container_padding_top_mobile',
                                              'container_padding_bottom_mobile',
                                              v
                                            ),
                                        }),
                                        /* @__PURE__ */ jsx2(PxField, {
                                          label: 'M Horizontal',
                                          value:
                                            config.container_padding_left_mobile,
                                          onChange: (v) =>
                                            updateBoth(
                                              'container_padding_left_mobile',
                                              'container_padding_right_mobile',
                                              v
                                            ),
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                                /* @__PURE__ */ jsxs('div', {
                                  style: {
                                    borderTop: '1px solid #eee',
                                    paddingTop: '12px',
                                  },
                                  children: [
                                    /* @__PURE__ */ jsx2(Text, {
                                      variant: 'headingSm',
                                      as: 'h6',
                                      children: 'Preview Bar Shape',
                                    }),
                                    /* @__PURE__ */ jsx2(Select, {
                                      label: 'Preview Bar Shape',
                                      options: [
                                        {
                                          label: 'Rectangle',
                                          value: 'rectangle',
                                        },
                                        { label: 'Circle', value: 'circle' },
                                      ],
                                      value:
                                        config.preview_item_shape ||
                                        'rectangle',
                                      onChange: (v) =>
                                        updateConfig('preview_item_shape', v),
                                    }),
                                  ],
                                }),
                                /* @__PURE__ */ jsxs('div', {
                                  style: {
                                    borderTop: '1px solid #eee',
                                    paddingTop: '12px',
                                  },
                                  children: [
                                    /* @__PURE__ */ jsx2(Text, {
                                      variant: 'headingSm',
                                      as: 'h6',
                                      children: 'Buttons visibility',
                                    }),
                                    /* @__PURE__ */ jsxs('div', {
                                      style: {
                                        display: 'flex',
                                        gap: '10px',
                                        marginTop: '8px',
                                      },
                                      children: [
                                        /* @__PURE__ */ jsx2(Checkbox, {
                                          label: 'Add to Cart',
                                          checked:
                                            !!config.show_add_to_cart_btn,
                                          onChange: (v) =>
                                            updateConfig(
                                              'show_add_to_cart_btn',
                                              v
                                            ),
                                        }),
                                        /* @__PURE__ */ jsx2(Checkbox, {
                                          label: 'Buy Now',
                                          checked: !!config.show_buy_btn,
                                          onChange: (v) =>
                                            updateConfig('show_buy_btn', v),
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                              ],
                            }),
                          }),
                        ],
                      }),
                    activeCategory === 'advanced' &&
                      /* @__PURE__ */ jsxs(Fragment, {
                        children: [
                          /* @__PURE__ */ jsx2(CollapsibleCard, {
                            title: 'Discount',
                            expanded: expandedSections.discount,
                            onToggle: () => toggleSection('discount'),
                            children: /* @__PURE__ */ jsxs(FormLayout, {
                              children: [
                                /* @__PURE__ */ jsxs('div', {
                                  style: { marginBottom: '12px' },
                                  children: [
                                    /* @__PURE__ */ jsx2(Text, {
                                      variant: 'headingSm',
                                      as: 'h6',
                                      children: 'Discount Offer',
                                    }),
                                    /* @__PURE__ */ jsxs(ButtonGroup, {
                                      segmented: true,
                                      children: [
                                        /* @__PURE__ */ jsx2(Button, {
                                          pressed:
                                            config.has_discount_offer === true,
                                          onClick: () =>
                                            updateConfig(
                                              'has_discount_offer',
                                              true
                                            ),
                                          children: 'Yes',
                                        }),
                                        /* @__PURE__ */ jsx2(Button, {
                                          pressed:
                                            config.has_discount_offer === false,
                                          onClick: () =>
                                            updateConfig(
                                              'has_discount_offer',
                                              false
                                            ),
                                          children: 'No',
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                                config.has_discount_offer &&
                                  /* @__PURE__ */ jsx2(Select, {
                                    label: 'Select Discount',
                                    options: [
                                      {
                                        label: '-- Choose a discount --',
                                        value: '',
                                      },
                                      ...localActiveDiscounts.map((d) => ({
                                        label: `${d.title} (${d.type || 'custom'})`,
                                        value: String(d.id),
                                      })),
                                    ],
                                    value: String(
                                      config.selected_discount_id || ''
                                    ),
                                    onChange: (v) =>
                                      updateConfig(
                                        'selected_discount_id',
                                        v ? Number(v) : null
                                      ),
                                  }),
                                !config.has_discount_offer &&
                                  /* @__PURE__ */ jsx2(Button, {
                                    onClick: () =>
                                      setCreateDiscountModalOpen(true),
                                    children: 'Create Discount',
                                  }),
                                /* @__PURE__ */ jsxs('div', {
                                  style: {
                                    marginTop: '16px',
                                    borderTop: '1px solid #eee',
                                    paddingTop: '12px',
                                  },
                                  children: [
                                    /* @__PURE__ */ jsx2(TextField, {
                                      label: 'Max Selections',
                                      type: 'number',
                                      value: String(config.max_selections),
                                      onChange: (v) =>
                                        updateConfig(
                                          'max_selections',
                                          Number(v)
                                        ),
                                      min: 3,
                                      max: 10,
                                      autoComplete: 'off',
                                    }),
                                    /* @__PURE__ */ jsx2(TextField, {
                                      label: 'Limit Reached Message',
                                      value: config.limit_reached_message,
                                      onChange: (v) =>
                                        updateConfig(
                                          'limit_reached_message',
                                          v
                                        ),
                                      autoComplete: 'off',
                                      helpText:
                                        'Use {{limit}} as a placeholder for the max selections number.',
                                    }),
                                    /* @__PURE__ */ jsx2(TextField, {
                                      label: 'Discount Motivation Text',
                                      value: config.discount_motivation_text,
                                      onChange: (v) =>
                                        updateConfig(
                                          'discount_motivation_text',
                                          v
                                        ),
                                      autoComplete: 'off',
                                      helpText:
                                        'Use {{remaining}} as a placeholder for the items left to unlock discount.',
                                    }),
                                    /* @__PURE__ */ jsx2(TextField, {
                                      label: 'Discount Unlocked Text',
                                      value: config.discount_unlocked_text,
                                      onChange: (v) =>
                                        updateConfig(
                                          'discount_unlocked_text',
                                          v
                                        ),
                                      autoComplete: 'off',
                                    }),
                                  ],
                                }),
                              ],
                            }),
                          }),
                          /* @__PURE__ */ jsx2(CollapsibleCard, {
                            title: 'Progress Bar',
                            expanded: expandedSections.progressBar,
                            onToggle: () => toggleSection('progressBar'),
                            children: /* @__PURE__ */ jsxs(FormLayout, {
                              children: [
                                /* @__PURE__ */ jsx2(Checkbox, {
                                  label: 'Show Top Progress Bar',
                                  checked: !!config.show_progress_bar,
                                  onChange: (v) =>
                                    updateConfig('show_progress_bar', v),
                                }),
                                config.show_progress_bar &&
                                  /* @__PURE__ */ jsxs(Fragment, {
                                    children: [
                                      /* @__PURE__ */ jsx2(ColorPickerField, {
                                        label: 'Progress Bar Color',
                                        value: config.progress_bar_color,
                                        onChange: (v) =>
                                          updateConfig('progress_bar_color', v),
                                      }),
                                      /* @__PURE__ */ jsx2(TextField, {
                                        label: 'Progress Text',
                                        value: config.progress_text || '',
                                        onChange: (v) =>
                                          updateConfig('progress_text', v),
                                        autoComplete: 'off',
                                        helpText: 'Text shown on progress bar',
                                      }),
                                      /* @__PURE__ */ jsx2(PxField, {
                                        label: 'Progress Bar Width (%)',
                                        value: config.progress_bar_width,
                                        onChange: (v) =>
                                          updateConfig('progress_bar_width', v),
                                        min: 10,
                                        max: 100,
                                        suffix: '%',
                                      }),
                                    ],
                                  }),
                              ],
                            }),
                          }),
                        ],
                      }),
                  ],
                }),
              ],
            }),
          ],
        },
        formKey
      ),
      /* @__PURE__ */ jsx2(Modal, {
        open: createDiscountModalOpen,
        onClose: () => {
          setCreateDiscountModalOpen(false);
          setDTitle('');
          setDCode('');
          setDType('percentage');
          setDValue('');
          setDStartsAt('');
          setDEndsAt('');
          setDOncePerCustomer(false);
        },
        title: 'Create Discount',
        primaryAction: {
          content: 'Create',
          onAction: handleCreateDiscount,
          loading: discountFetcher.state === 'submitting',
        },
        secondaryActions: [
          {
            content: 'Cancel',
            onAction: () => {
              setCreateDiscountModalOpen(false);
              setDTitle('');
              setDCode('');
              setDType('percentage');
              setDValue('');
              setDStartsAt('');
              setDEndsAt('');
              setDOncePerCustomer(false);
            },
          },
        ],
        children: /* @__PURE__ */ jsx2(Modal.Section, {
          children: /* @__PURE__ */ jsxs('div', {
            style: { padding: '8px 0' },
            children: [
              /* @__PURE__ */ jsxs('div', {
                style: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '20px',
                  marginBottom: '20px',
                },
                children: [
                  /* @__PURE__ */ jsxs('div', {
                    style: { display: 'flex', flexDirection: 'column' },
                    children: [
                      /* @__PURE__ */ jsx2('label', {
                        style: {
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#111',
                          marginBottom: '8px',
                        },
                        children: 'Title *',
                      }),
                      /* @__PURE__ */ jsx2('span', {
                        style: {
                          fontSize: '12px',
                          color: '#6B7280',
                          marginBottom: '6px',
                        },
                        children: 'Shown in Shopify Admin discounts',
                      }),
                      /* @__PURE__ */ jsx2('input', {
                        required: true,
                        value: dTitle,
                        onChange: (e) => setDTitle(e.target.value),
                        style: {
                          padding: '10px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          transition: 'all 0.2s',
                        },
                        onFocus: (e) =>
                          (e.target.style.borderColor = '#667eea'),
                        onBlur: (e) => (e.target.style.borderColor = '#D1D5DB'),
                        placeholder: 'Summer Sale 20% Off',
                      }),
                    ],
                  }),
                  /* @__PURE__ */ jsxs('div', {
                    style: { display: 'flex', flexDirection: 'column' },
                    children: [
                      /* @__PURE__ */ jsx2('label', {
                        style: {
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#111',
                          marginBottom: '8px',
                        },
                        children: 'Code *',
                      }),
                      /* @__PURE__ */ jsx2('span', {
                        style: {
                          fontSize: '12px',
                          color: '#6B7280',
                          marginBottom: '6px',
                        },
                        children: 'Must be unique. Try a distinctive name',
                      }),
                      /* @__PURE__ */ jsx2('input', {
                        required: true,
                        value: dCode,
                        onChange: (e) => setDCode(e.target.value.toUpperCase()),
                        style: {
                          padding: '10px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          transition: 'all 0.2s',
                        },
                        onFocus: (e) =>
                          (e.target.style.borderColor = '#667eea'),
                        onBlur: (e) => (e.target.style.borderColor = '#D1D5DB'),
                        placeholder: 'SAVE10WINTER',
                      }),
                    ],
                  }),
                ],
              }),
              /* @__PURE__ */ jsxs('div', {
                style: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '20px',
                  marginBottom: '20px',
                },
                children: [
                  /* @__PURE__ */ jsxs('div', {
                    style: { display: 'flex', flexDirection: 'column' },
                    children: [
                      /* @__PURE__ */ jsx2('label', {
                        style: {
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#111',
                          marginBottom: '8px',
                        },
                        children: 'Type *',
                      }),
                      /* @__PURE__ */ jsxs('select', {
                        value: dType,
                        onChange: (e) => setDType(e.target.value),
                        style: {
                          padding: '10px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          background: '#fff',
                          cursor: 'pointer',
                        },
                        required: true,
                        children: [
                          /* @__PURE__ */ jsx2('option', {
                            value: 'percentage',
                            children: 'Percentage off (%)',
                          }),
                          /* @__PURE__ */ jsx2('option', {
                            value: 'amount',
                            children: 'Fixed amount off',
                          }),
                        ],
                      }),
                    ],
                  }),
                  /* @__PURE__ */ jsxs('div', {
                    style: { display: 'flex', flexDirection: 'column' },
                    children: [
                      /* @__PURE__ */ jsx2('label', {
                        style: {
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#111',
                          marginBottom: '8px',
                        },
                        children: 'Value *',
                      }),
                      /* @__PURE__ */ jsx2('span', {
                        style: {
                          fontSize: '12px',
                          color: '#6B7280',
                          marginBottom: '6px',
                        },
                        children:
                          dType === 'percentage'
                            ? 'Enter 0\u2013100'
                            : 'Enter amount in your store currency',
                      }),
                      /* @__PURE__ */ jsx2('input', {
                        type: 'number',
                        min: '0.01',
                        step: '0.01',
                        required: true,
                        value: dValue,
                        onChange: (e) => setDValue(e.target.value),
                        style: {
                          padding: '10px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                        },
                        placeholder: dType === 'percentage' ? '10' : '20',
                      }),
                    ],
                  }),
                ],
              }),
              /* @__PURE__ */ jsxs('div', {
                style: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '20px',
                  marginBottom: '20px',
                },
                children: [
                  /* @__PURE__ */ jsxs('div', {
                    style: { display: 'flex', flexDirection: 'column' },
                    children: [
                      /* @__PURE__ */ jsx2('label', {
                        style: {
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#111',
                          marginBottom: '8px',
                        },
                        children: 'Starts at *',
                      }),
                      /* @__PURE__ */ jsx2('span', {
                        style: {
                          fontSize: '12px',
                          color: '#6B7280',
                          marginBottom: '6px',
                        },
                        children: 'When the discount becomes active',
                      }),
                      /* @__PURE__ */ jsx2('input', {
                        type: 'datetime-local',
                        required: true,
                        value: dStartsAt,
                        onChange: (e) => setDStartsAt(e.target.value),
                        style: {
                          padding: '10px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                        },
                      }),
                    ],
                  }),
                  /* @__PURE__ */ jsxs('div', {
                    style: { display: 'flex', flexDirection: 'column' },
                    children: [
                      /* @__PURE__ */ jsx2('label', {
                        style: {
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#111',
                          marginBottom: '8px',
                        },
                        children: 'Ends at (optional)',
                      }),
                      /* @__PURE__ */ jsx2('span', {
                        style: {
                          fontSize: '12px',
                          color: '#6B7280',
                          marginBottom: '6px',
                        },
                        children: 'Leave blank for no end date',
                      }),
                      /* @__PURE__ */ jsx2('input', {
                        type: 'datetime-local',
                        value: dEndsAt,
                        onChange: (e) => setDEndsAt(e.target.value),
                        style: {
                          padding: '10px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                        },
                      }),
                    ],
                  }),
                ],
              }),
              /* @__PURE__ */ jsxs('label', {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '20px',
                  cursor: 'pointer',
                },
                children: [
                  /* @__PURE__ */ jsx2('input', {
                    type: 'checkbox',
                    checked: dOncePerCustomer,
                    onChange: (e) => setDOncePerCustomer(e.target.checked),
                    style: { width: '18px', height: '18px', cursor: 'pointer' },
                  }),
                  /* @__PURE__ */ jsxs('div', {
                    children: [
                      /* @__PURE__ */ jsx2('span', {
                        style: {
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#111',
                          display: 'block',
                        },
                        children: 'Applies once per customer',
                      }),
                      /* @__PURE__ */ jsx2('span', {
                        style: { fontSize: '12px', color: '#6B7280' },
                      }),
                    ],
                  }),
                ],
              }),
              /* @__PURE__ */ jsxs('label', {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '20px',
                  cursor: 'pointer',
                },
                children: [
                  /* @__PURE__ */ jsx2('input', {
                    type: 'checkbox',
                    checked: dAutoApply,
                    onChange: (e) => setDAutoApply(e.target.checked),
                    style: { width: '18px', height: '18px', cursor: 'pointer' },
                  }),
                  /* @__PURE__ */ jsxs('div', {
                    children: [
                      /* @__PURE__ */ jsx2('span', {
                        style: {
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#111',
                          display: 'block',
                        },
                        children: 'Auto Apply Discount',
                      }),
                      /* @__PURE__ */ jsx2('span', {
                        style: { fontSize: '12px', color: '#6B7280' },
                        children:
                          'Automatically apply this discount when conditions are met',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        }),
      }),
    ],
  });
}
function ComboPreview({
  config,
  device,
  products,
  collections = [],
  activeTab,
  setActiveTab,
  isLoading,
  activeDiscounts = [],
}) {
  const isMobile = device === 'mobile';
  const sliderRef = useRef(null);
  const previewStyles = `
    .cdo-slider-horizontal::-webkit-scrollbar {
      display: none !important;
    }
    .cdo-slider-horizontal::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 10px;
    }
    .cdo-slider-horizontal::-webkit-scrollbar-thumb {
      background: ${config.selection_highlight_color || '#ca275c'};
      border-radius: 10px;
    }
    .cdo-slider-horizontal {
      scrollbar-width: none;
      -ms-overflow-style: none;
      scroll-behavior: smooth;
    }
    .cdo-arrow-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #fff;
      border: 1px solid #ddd;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
      transition: all 0.2s;
    }
    .cdo-arrow-btn:hover {
      background: ${config.selection_highlight_color || '#ca275c'};
      color: #fff;
      border-color: ${config.selection_highlight_color || '#ca275c'};
    }
  `;
  const paddingTop = isMobile
    ? config.container_padding_top_mobile
    : config.container_padding_top_desktop;
  const paddingRight = isMobile
    ? config.container_padding_right_mobile
    : config.container_padding_right_desktop;
  const paddingBottom = isMobile
    ? config.container_padding_bottom_mobile
    : config.container_padding_bottom_desktop;
  const paddingLeft = isMobile
    ? config.container_padding_left_mobile
    : config.container_padding_left_desktop;
  const bannerWidth = isMobile
    ? config.banner_width_mobile || config.banner_width_desktop || 100
    : config.banner_width_desktop || 100;
  const bannerHeight = isMobile
    ? config.banner_height_mobile || config.banner_height_desktop || 120
    : config.banner_height_desktop || 180;
  const finalBannerHeight =
    config.banner_fit_mode === 'adapt' ? 'auto' : `${bannerHeight}px`;
  const bannerObjectFit =
    config.banner_fit_mode === 'cover' || config.banner_fit_mode === 'contain'
      ? config.banner_fit_mode
      : 'initial';
  const previewAlignment = isMobile
    ? config.preview_alignment_mobile
    : config.preview_alignment;
  const previewJustify = previewAlignment;
  const previewGap = config.preview_item_gap ?? 12;
  const previewShape = config.preview_item_shape || 'circle';
  const previewAlignItems = config.preview_align_items || 'center';
  const previewFontWeight = config.preview_font_weight || 600;
  const productTitleSize = isMobile
    ? config.product_title_size_mobile || 13
    : config.product_title_size_desktop || 15;
  const productPriceSize = isMobile
    ? config.product_price_size_mobile || 13
    : config.product_price_size_desktop || 15;
  const productCardPadding = config.product_card_padding ?? 10;
  const viewportWidth = '100%';
  const columns = isMobile ? config.mobile_columns : config.desktop_columns;
  const numericColumns = Math.max(1, Number(columns) || 1);
  const gridGap = Number(config.products_gap ?? 12);
  const effectiveColumns = numericColumns;
  const productImageHeight = isMobile
    ? config.product_image_height_mobile
    : config.product_image_height_desktop;
  const headingAlign = config.heading_align || 'left';
  const descriptionAlign = config.description_align || 'left';
  const renderTitleDescription = () =>
    /* @__PURE__ */ jsx2('div', {
      style: { width: `${config.title_width || 100}%`, margin: '0 auto' },
      children: /* @__PURE__ */ jsxs('div', {
        style: {
          paddingTop: config.title_container_padding_top,
          paddingRight: config.title_container_padding_right,
          paddingBottom: config.title_container_padding_bottom,
          paddingLeft: config.title_container_padding_left,
          textAlign: headingAlign,
        },
        children: [
          /* @__PURE__ */ jsx2('h1', {
            style: {
              fontSize: config.heading_size,
              marginBottom: 4,
              color: config.heading_color,
              fontWeight: config.heading_font_weight || 700,
              textAlign: headingAlign,
            },
            children: config.collection_title,
          }),
          /* @__PURE__ */ jsx2('p', {
            style: {
              fontSize: config.description_size,
              color: config.description_color,
              fontWeight: config.description_font_weight || 400,
              textAlign: descriptionAlign,
            },
            children: config.collection_description,
          }),
        ],
      }),
    });
  const cardBorderRadius = config.card_border_radius || 12;
  const maxSel = Number(config.max_selections) || 3;
  const baseSizeDesktop = maxSel > 3 ? Math.max(30, 56 - (maxSel - 3) * 8) : 56;
  const baseSizeMobile = maxSel > 3 ? Math.max(24, 44 - (maxSel - 3) * 6) : 44;
  const baseSize = isMobile ? baseSizeMobile : baseSizeDesktop;
  const shapeStyles = (size) => {
    if (previewShape === 'circle')
      return { width: size, height: size, borderRadius: '50%' };
    if (previewShape === 'rectangle')
      return {
        width: size * 1.4,
        height: size * 0.8,
        borderRadius: config.preview_border_radius,
      };
    return {
      width: size,
      height: size,
      borderRadius: config.preview_border_radius,
    };
  };
  const renderBanner = () => {
    if (config.show_banner === false) return null;
    const bannerUrl =
      isMobile && config.banner_image_mobile_url
        ? config.banner_image_mobile_url
        : config.banner_image_url;
    const bannerImage =
      bannerUrl ||
      'https://cdn.shopify.com/s/files/1/0070/7032/files/fresh-vegetables-and-fruits.jpg?v=1614349455';
    if (config.layout === 'layout2') {
      return /* @__PURE__ */ jsxs('div', {
        style: {
          position: 'relative',
          width: `${bannerWidth}%`,
          margin: '0 auto',
          height: finalBannerHeight,
          overflow: 'hidden',
        },
        children: [
          /* @__PURE__ */ jsx2('img', {
            src: bannerImage,
            alt: 'Banner',
            style: {
              width: '100%',
              height: config.banner_fit_mode === 'adapt' ? 'auto' : '100%',
              objectFit: bannerObjectFit,
            },
          }),
          /* @__PURE__ */ jsxs('div', {
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background:
                'linear-gradient(180deg, rgba(0,0,0,0) 20%, rgba(0,0,0,0.7) 100%)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '24px 20px',
              color: 'white',
            },
            children: [
              /* @__PURE__ */ jsx2('h1', {
                style: { fontSize: '36px', fontWeight: '800', margin: 0 },
                children: config.banner_title || config.collection_title,
              }),
              /* @__PURE__ */ jsx2('p', {
                style: { fontSize: '14px', opacity: 0.9 },
                children:
                  config.banner_subtitle || config.collection_description,
              }),
            ],
          }),
        ],
      });
    }
    return /* @__PURE__ */ jsx2('div', {
      style: {
        width: config.banner_full_width
          ? `calc(100% + ${paddingLeft + paddingRight}px)`
          : `${bannerWidth}%`,
        height: finalBannerHeight,
        background: bannerUrl ? 'none' : '#e0e0e0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: config.banner_padding_top,
        paddingBottom: config.banner_padding_bottom,
        margin: config.banner_full_width ? `0 -${paddingLeft}px` : '0 auto',
        overflow: 'hidden',
      },
      children: bannerUrl
        ? /* @__PURE__ */ jsx2('img', {
            src: bannerUrl,
            alt: 'Banner',
            style: {
              width: '100%',
              height: config.banner_fit_mode === 'adapt' ? 'auto' : '100%',
              objectFit: bannerObjectFit,
              display: 'block',
            },
          })
        : /* @__PURE__ */ jsx2('span', {
            style: { color: '#999' },
            children: 'Banner Image',
          }),
    });
  };
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [cardQtys, setCardQtys] = useState({});
  const [currentSlide, setCurrentSlide] = useState(0);
  const banners = useMemo(
    () =>
      [
        {
          image: config.banner_1_image,
          title: config.banner_1_title,
          subtitle: config.banner_1_subtitle,
        },
        {
          image: config.banner_2_image,
          title: config.banner_2_title,
          subtitle: config.banner_2_subtitle,
        },
        {
          image: config.banner_3_image,
          title: config.banner_3_title,
          subtitle: config.banner_3_subtitle,
        },
      ].filter((b) => b.image),
    [
      config.banner_1_image,
      config.banner_1_title,
      config.banner_1_subtitle,
      config.banner_2_image,
      config.banner_2_title,
      config.banner_2_subtitle,
      config.banner_3_image,
      config.banner_3_title,
      config.banner_3_subtitle,
    ]
  );
  useEffect(() => {
    if (!config.enable_banner_slider || banners.length <= 1) return;
    const interval = setInterval(
      () => {
        setCurrentSlide((prev) => (prev + 1) % banners.length);
      },
      (config.slider_speed || 5) * 1e3
    );
    return () => clearInterval(interval);
  }, [config.enable_banner_slider, config.slider_speed, banners.length]);
  const [bundleIndex, setBundleIndex] = useState(0);
  const titles = useMemo(
    () => (config.bundle_titles || '').split(',').filter((t) => t.trim()),
    [config.bundle_titles]
  );
  const subtitles = useMemo(
    () => (config.bundle_subtitles || '').split(',').filter((t) => t.trim()),
    [config.bundle_subtitles]
  );
  const [timeLeft, setTimeLeft] = useState(() => {
    return (
      Number(config.timer_hours || 0) * 3600 +
      Number(config.timer_minutes || 0) * 60 +
      Number(config.timer_seconds || 0)
    );
  });
  useEffect(() => {
    const totalSeconds =
      Number(config.timer_hours || 0) * 3600 +
      Number(config.timer_minutes || 0) * 60 +
      Number(config.timer_seconds || 0);
    setTimeLeft(totalSeconds);
  }, [config.timer_hours, config.timer_minutes, config.timer_seconds]);
  useEffect(() => {
    if (timeLeft <= 0) {
      if (config.auto_reset_timer) {
        const totalSeconds =
          Number(config.timer_hours || 0) * 3600 +
          Number(config.timer_minutes || 0) * 60 +
          Number(config.timer_seconds || 0);
        setTimeLeft(totalSeconds);
        if (config.change_bundle_on_timer_end && titles.length > 0) {
          setBundleIndex((prev) => (prev + 1) % titles.length);
        }
      }
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1e3);
    return () => clearInterval(timer);
  }, [
    timeLeft,
    config.auto_reset_timer,
    config.change_bundle_on_timer_end,
    titles.length,
    config.timer_hours,
    config.timer_minutes,
    config.timer_seconds,
  ]);
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return {
      h: String(h).padStart(2, '0'),
      m: String(m).padStart(2, '0'),
      s: String(s).padStart(2, '0'),
    };
  };
  const time = formatTime(timeLeft);
  const totalItems = selectedProducts.reduce(
    (sum, p) => sum + (Number(p.quantity) || 0),
    0
  );
  const discountThreshold = Math.max(
    1,
    parseInt(config.discount_threshold) || 1
  );
  const handleQtyChange = (pid, val, source = 'all') => {
    const qty = Math.max(0, parseInt(val) || 0);
    const maxSel2 = parseInt(config.max_selections) || 3;
    if (qty === 0) {
      handleRemoveProduct(pid, source);
      return;
    }
    setSelectedProducts((selected) => {
      const item = selected.find(
        (p) => String(p.id) === String(pid) && p.source === source
      );
      if (!item) return selected;
      const otherQtySum = selected
        .filter((p) => !(String(p.id) === String(pid) && p.source === source))
        .reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
      const currentQtyInSource = selected
        .filter((p) => p.source === source && !(String(p.id) === String(pid)))
        .reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
      let sourceLimit = 999;
      if (source.startsWith('step_')) {
        const stepIdx = source.replace('step_', '');
        sourceLimit = parseInt(config[`step_${stepIdx}_limit`]) || 999;
      } else if (source !== 'all') {
        for (let i = 1; i <= 4; i++) {
          if (config[`col_${i}`] === source) {
            sourceLimit = parseInt(config[`col_${i}_limit`]) || 999;
            break;
          }
        }
      }
      const allowedByGlobal = maxSel2 - otherQtySum;
      const allowedBySource = sourceLimit - currentQtyInSource;
      const finalAllowed = Math.max(
        1,
        Math.min(qty, allowedByGlobal, allowedBySource)
      );
      if (finalAllowed < qty) {
        shopify.toast.show(
          `Limit reached! Max allowed here is ${finalAllowed}`,
          { isError: true }
        );
      }
      setCardQtys((prev) => ({ ...prev, [pid]: finalAllowed }));
      return selected.map((p) =>
        String(p.id) === String(pid) && p.source === source
          ? { ...p, quantity: finalAllowed }
          : p
      );
    });
  };
  const handleInc = (pid, variant = null, source = 'all') => {
    const isSelected = selectedProducts.some(
      (p) => String(p.id) === String(pid) && p.source === source
    );
    const product = shopifyProducts.find((p) => String(p.id) === String(pid));
    if (!product) return;
    const currentQtyInSource = selectedProducts
      .filter((p) => p.source === source)
      .reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
    let sourceLimit = 999;
    if (source.startsWith('step_')) {
      const stepIdx = source.replace('step_', '');
      sourceLimit = parseInt(config[`step_${stepIdx}_limit`]) || 999;
    } else if (source !== 'all') {
      for (let i = 1; i <= 4; i++) {
        if (config[`col_${i}`] === source) {
          sourceLimit = parseInt(config[`col_${i}_limit`]) || 999;
          break;
        }
      }
    }
    if (currentQtyInSource >= sourceLimit) {
      shopify.toast.show(
        `Limit reached for this category! (Max ${sourceLimit} items)`,
        { isError: true }
      );
      return;
    }
    const currentTotalQty = selectedProducts.reduce(
      (sum, p) => sum + (Number(p.quantity) || 0),
      0
    );
    const maxThreshold =
      parseInt(config.max_selections) ||
      Math.max(3, parseInt(config.discount_threshold) || 3);
    if (!isSelected) {
      if (currentTotalQty >= maxThreshold) {
        shopify.toast.show(
          `Global limit reached! You can only add up to ${maxThreshold} items.`,
          { isError: true }
        );
        return;
      }
      handleAddProduct(product, 1, variant, source);
    } else {
      handleQtyChange(pid, (cardQtys[pid] || 0) + 1, source);
      const nextTotal = currentTotalQty + 1;
      if (nextTotal >= discountThreshold) {
        shopify.toast.show(
          config.discount_unlocked_text || 'Discount Unlocked! \u{1F389}'
        );
      } else {
        const remaining = discountThreshold - nextTotal;
        const motivation = (
          config.discount_motivation_text ||
          'Add {{remaining}} more items to unlock the discount!'
        ).replace('{{remaining}}', remaining);
        shopify.toast.show(motivation);
      }
    }
  };
  const handleDec = (pid, source = 'all') => {
    const isSelected = selectedProducts.some(
      (p) => String(p.id) === String(pid) && p.source === source
    );
    if (!isSelected) return;
    const item = selectedProducts.find(
      (p) => String(p.id) === String(pid) && p.source === source
    );
    const currentQty =
      cardQtys[pid] !== void 0 ? cardQtys[pid] : item?.quantity;
    handleQtyChange(pid, currentQty - 1, source);
  };
  const handleAddProduct = (
    product,
    initialQty,
    variant = null,
    source = 'all'
  ) => {
    const qty = initialQty || cardQtys[product.id] || 1;
    const selectedVariant =
      variant ||
      (product.variants || []).find(
        (v) => String(v.id) === String(selectedVariants[product.id])
      ) ||
      (product.variants && product.variants[0]);
    if (!selectedVariant) return;
    const currentTotalQty = selectedProducts.reduce(
      (sum, p) => sum + (Number(p.quantity) || 0),
      0
    );
    const maxThreshold = parseInt(config.max_selections) || 3;
    if (currentTotalQty + Number(qty) > maxThreshold) {
      shopify.toast.show(
        `Global limit reached! You can only add up to ${maxThreshold} items.`,
        { isError: true }
      );
      return;
    }
    const currentQtyInSource = selectedProducts
      .filter((p) => p.source === source)
      .reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
    let sourceLimit = 999;
    if (source.startsWith('step_')) {
      const stepIdx = source.replace('step_', '');
      sourceLimit = parseInt(config[`step_${stepIdx}_limit`]) || 999;
    } else if (source !== 'all') {
      for (let i = 1; i <= (config.tab_count || 4); i++) {
        if (config[`col_${i}`] === source) {
          sourceLimit = parseInt(config[`col_${i}_limit`]) || 999;
          break;
        }
      }
    }
    if (currentQtyInSource + Number(qty) > sourceLimit) {
      shopify.toast.show(
        `Limit reached for this category! (Max ${sourceLimit} items)`,
        { isError: true }
      );
      return;
    }
    const newItem = {
      id: product.id,
      variantId: selectedVariant.id,
      image:
        selectedVariant.image?.src ||
        selectedVariant.image?.url ||
        product.image?.src ||
        product.featuredImage?.url ||
        'https://placehold.co/100x100',
      price: parseFloat(selectedVariant.price || 0),
      quantity: Number(qty),
      source,
    };
    setSelectedProducts([...selectedProducts, newItem]);
    setCardQtys((prev) => ({ ...prev, [product.id]: Number(qty) }));
    const nextTotal = currentTotalQty + Number(qty);
    if (nextTotal >= discountThreshold) {
      shopify.toast.show(
        config.discount_unlocked_text || 'Discount Unlocked! \u{1F389}'
      );
    } else {
      const remaining = discountThreshold - nextTotal;
      const motivation = (
        config.discount_motivation_text ||
        'Add {{remaining}} more items to unlock the discount!'
      ).replace('{{remaining}}', remaining);
      shopify.toast.show(motivation);
    }
  };
  const handleRemoveProduct = (productId, source = 'all') => {
    setSelectedProducts(
      selectedProducts.filter(
        (p) => !(String(p.id) === String(productId) && p.source === source)
      )
    );
    setCardQtys((prev) => ({ ...prev, [productId]: 0 }));
  };
  const totalPrice = selectedProducts.reduce(
    (sum, p) => sum + p.price * (p.quantity || 0),
    0
  );
  const selectedDiscount =
    config.has_discount_offer && config.selected_discount_id
      ? activeDiscounts.find(
          (d) => String(d.id) === String(config.selected_discount_id)
        )
      : null;
  const discountType = selectedDiscount
    ? selectedDiscount.type
    : config.discount_selection;
  const discountVal = selectedDiscount
    ? parseFloat(selectedDiscount.value)
    : parseFloat(config.discount_amount) || 0;
  const discountedPrice =
    String(discountType).toLowerCase() === 'percentage'
      ? totalPrice * (1 - discountVal / 100)
      : Math.max(0, totalPrice - discountVal);
  const finalPrice =
    totalItems >= discountThreshold ? discountedPrice : totalPrice;
  const renderTabs = () => {
    if (config.layout !== 'layout2') return null;
    const tabs = [];
    if (config.show_tab_all !== false) {
      tabs.push({ label: config.tab_all_label || 'Collections', value: 'all' });
    }
    for (let i = 1; i <= (config.tab_count || 4); i++) {
      const handle = config[`col_${i}`];
      if (handle) {
        const col = (collections || []).find((c) => c.handle === handle);
        tabs.push({
          label: col ? col.title : config[`step_${i}_title`] || handle,
          value: handle,
        });
      }
    }
    if (tabs.length === 0) return null;
    return /* @__PURE__ */ jsx2('div', {
      style: { width: `${config.tabs_width || 100}%`, margin: '0 auto' },
      children: /* @__PURE__ */ jsx2('div', {
        style: {
          padding: '12px 20px',
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          borderBottom: '1px solid #eee',
          background: '#fff',
        },
        className: 'cdo-slider-horizontal',
        children: tabs.map((tab, idx) => {
          const isActive = activeTab === tab.value;
          return /* @__PURE__ */ jsx2(
            'button',
            {
              onClick: () => setActiveTab(tab.value),
              style: {
                padding: '8px 18px',
                borderRadius: '25px',
                border: `1px solid ${isActive ? config.selection_highlight_color || '#000' : '#eee'}`,
                background: isActive
                  ? config.selection_highlight_color || '#000'
                  : '#fff',
                color: isActive ? '#fff' : '#444',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.3s ease',
              },
              children: tab.label,
            },
            idx
          );
        }),
      }),
    });
  };
  const renderProgressBar = () => {
    if (!config.show_progress_bar) return null;
    const percent =
      discountThreshold > 0
        ? Math.min(100, Math.round((totalItems / discountThreshold) * 100))
        : 0;
    const primaryColor =
      config.primary_color || config.selection_highlight_color || '#ca275c';
    return /* @__PURE__ */ jsx2('div', {
      style: {
        width: `${config.progress_bar_width || 100}%`,
        margin: '0 auto',
      },
      children: /* @__PURE__ */ jsxs('div', {
        style: { padding: '20px 20px 10px' },
        children: [
          /* @__PURE__ */ jsxs('div', {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              fontWeight: '700',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            },
            children: [
              /* @__PURE__ */ jsx2('span', {
                style: { color: config.progress_bar_color || '#000' },
                children:
                  config.progress_text ||
                  (totalItems < discountThreshold
                    ? `Add ${discountThreshold - totalItems} more for discount`
                    : 'Discount Unlocked!'),
              }),
              /* @__PURE__ */ jsxs('span', {
                style: { color: '#6d7175' },
                children: [percent, '%'],
              }),
            ],
          }),
          /* @__PURE__ */ jsx2('div', {
            style: {
              height: '8px',
              background: 'rgba(0,0,0,0.05)',
              borderRadius: '10px',
              overflow: 'hidden',
              position: 'relative',
            },
            children: /* @__PURE__ */ jsx2('div', {
              style: {
                height: '100%',
                width: `${percent}%`,
                background: config.progress_bar_color || '#000',
                transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: `0 0 10px ${config.progress_bar_color || '#000'}40`,
              },
              children: /* @__PURE__ */ jsx2('div', {
                style: {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background:
                    'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)',
                  backgroundSize: '20px 20px',
                  opacity: 0.2,
                },
              }),
            }),
          }),
        ],
      }),
    });
  };
  const renderPreviewBar = () =>
    /* @__PURE__ */ jsx2('div', {
      style: { width: `${config.preview_bar_width || 100}%`, margin: '0 auto' },
      children: /* @__PURE__ */ jsxs('div', {
        style: {
          background: config.preview_bar_bg,
          color: config.preview_bar_text_color,
          borderRadius: config.preview_border_radius,
          padding: config.preview_bar_padding,
          minHeight: config.preview_bar_height,
          fontSize: config.preview_font_size,
          fontWeight: previewFontWeight,
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: config.show_preview_bar ? 'flex' : 'none',
          flexDirection: 'column',
          gap: 0,
        },
        children: [
          /* @__PURE__ */ jsx2('div', {
            style: {
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: previewGap,
              width: '100%',
              minHeight: baseSize + 8,
              marginBottom: 4,
            },
            children: (() => {
              const flattenedProducts = selectedProducts.flatMap((p) =>
                Array(p.quantity || 0).fill(p)
              );
              return [...Array(maxSel)].map((_, i) => {
                const item = flattenedProducts[i];
                const shape = shapeStyles(baseSize);
                return /* @__PURE__ */ jsx2(
                  'div',
                  {
                    style: {
                      ...shape,
                      background: config.preview_item_color,
                      border: `2px solid ${config.preview_item_border_color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      padding: 0,
                      paddingTop: 0,
                      flexShrink: 0,
                      overflow: 'hidden',
                      boxShadow: item ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                      transition: 'box-shadow 0.2s',
                    },
                    children: item
                      ? /* @__PURE__ */ jsx2('img', {
                          src: item.image,
                          style: {
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: 'inherit',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                          },
                          alt: 'selected',
                        })
                      : /* @__PURE__ */ jsx2('span', {
                          style: { fontSize: baseSize * 0.7, color: '#bbb' },
                          children: '+',
                        }),
                  },
                  i
                );
              });
            })(),
          }),
          /* @__PURE__ */ jsx2('div', {
            style: { textAlign: 'center', marginBottom: 6 },
            children: /* @__PURE__ */ jsx2('div', {
              style: {
                fontSize: '13px',
                color: totalItems >= discountThreshold ? '#28a745' : '#888',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              },
              children:
                totalItems >= discountThreshold
                  ? /* @__PURE__ */ jsxs(Fragment, {
                      children: [
                        /* @__PURE__ */ jsx2('span', {
                          style: { fontSize: '16px' },
                          children: '\u{1F389}',
                        }),
                        config.discount_unlocked_text || 'Discount Unlocked!',
                      ],
                    })
                  : /* @__PURE__ */ jsx2(Fragment, {
                      children:
                        totalItems > 0 &&
                        (
                          config.discount_motivation_text ||
                          'Add {{remaining}} more to get a discount'
                        ).replace(
                          '{{remaining}}',
                          Math.max(0, discountThreshold - totalItems)
                        ),
                    }),
            }),
          }),
          /* @__PURE__ */ jsxs('div', {
            style: {
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              width: '100%',
              minHeight: 32,
            },
            children: [
              totalItems >= discountThreshold &&
                finalPrice < totalPrice &&
                /* @__PURE__ */ jsxs('span', {
                  style: {
                    fontSize: config.preview_original_price_size || 14,
                    color: config.preview_original_price_color || '#999',
                    textDecoration: 'line-through',
                    whiteSpace: 'nowrap',
                  },
                  children: ['Rs.', totalPrice.toFixed(2)],
                }),
              /* @__PURE__ */ jsxs('span', {
                style: {
                  fontSize: config.preview_discount_price_size || 18,
                  color:
                    config.preview_discount_price_color ||
                    config.selection_highlight_color ||
                    '#000',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                },
                children: ['Rs.', finalPrice.toFixed(2)],
              }),
            ],
          }),
          /* @__PURE__ */ jsxs('div', {
            style: {
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 18,
              width: '100%',
              minHeight: 40,
              marginTop: 8,
            },
            children: [
              config.show_add_to_cart_btn &&
                /* @__PURE__ */ jsx2('button', {
                  onClick: () =>
                    alert(config.checkout_btn_text || 'Proceed to Checkout'),
                  style: {
                    background:
                      config.preview_bar_button_bg ||
                      config.checkout_btn_bg ||
                      config.add_to_cart_btn_color,
                    color:
                      config.preview_bar_button_text ||
                      config.checkout_btn_text_color ||
                      config.add_to_cart_btn_text_color,
                    border: `1px solid ${config.buy_btn_color || '#000'}`,
                    padding: '10px 24px',
                    borderRadius: 8,
                    fontWeight: config.add_to_cart_btn_font_weight,
                    fontSize: config.add_to_cart_btn_font_size,
                    cursor: 'pointer',
                    marginRight: 8,
                    whiteSpace: 'nowrap',
                    minHeight: 40,
                    display: 'inline-flex',
                    alignItems: 'center',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    transition: 'box-shadow 0.2s',
                  },
                  children:
                    config.checkout_btn_text || config.add_to_cart_btn_text,
                }),
              config.show_buy_btn &&
                /* @__PURE__ */ jsx2('button', {
                  onClick: () => alert(config.buy_btn_text || 'Buy Now'),
                  style: {
                    background: config.buy_btn_color,
                    color: config.buy_btn_text_color,
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: 8,
                    fontWeight: config.buy_btn_font_weight,
                    fontSize: config.buy_btn_font_size,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    minHeight: 40,
                    display: 'inline-flex',
                    alignItems: 'center',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    transition: 'box-shadow 0.2s',
                  },
                  children: config.buy_btn_text,
                }),
            ],
          }),
        ],
      }),
    });
  const handleVariantChange = (productId, variantId) => {
    setSelectedVariants((prev) => ({ ...prev, [productId]: variantId }));
    setSelectedProducts((prev) =>
      prev.map((item) => {
        if (String(item.id) === String(productId)) {
          const prod = shopifyProducts.find(
            (p) => String(p.id) === String(productId)
          );
          const variant = prod?.variants?.find(
            (v) => String(v.id) === String(variantId)
          );
          if (variant) {
            return {
              ...item,
              variantId: variant.id,
              price: parseFloat(variant.price || 0),
              image: variant.image?.src || prod.image?.src,
            };
          }
        }
        return item;
      })
    );
  };
  const ProductCardItem = ({ product, source = 'all' }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const hasVariants = product.variants && product.variants.length > 1;
    const selectedVariantId =
      selectedVariants[product.id] ||
      (product.variants && product.variants[0]?.id);
    const selectedVariant =
      (product.variants || []).find((v) => v.id === selectedVariantId) ||
      (product.variants && product.variants[0]);
    const isSelected = selectedProducts.some(
      (p) => String(p.id) === String(product.id) && p.source === source
    );
    const onAddClick = () => {
      if (isSelected) {
        if (!config.show_quantity_selector) {
          handleRemoveProduct(product.id, source);
        } else {
          handleInc(product.id, selectedVariant, source);
        }
      } else {
        if (hasVariants && config.product_card_variants_display === 'popup') {
          setShowPopup(true);
        } else {
          handleAddProduct(product, 1, selectedVariant, source);
        }
      }
    };
    return /* @__PURE__ */ jsxs('div', {
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
      onClick: onAddClick,
      style: {
        cursor: 'pointer',
        border: isSelected
          ? `2px solid ${config.selection_highlight_color || '#000'}`
          : isHovered && !isMobile
            ? '2px solid #ccc'
            : '2px solid #eee',
        borderRadius: config.card_border_radius || 12,
        overflow: 'hidden',
        background: 'white',
        width: '100%',
        margin: 0,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        justifyContent: 'space-between',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        transform:
          isHovered && !isMobile ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow:
          isHovered && !isMobile
            ? '0 10px 20px rgba(0,0,0,0.1)'
            : '0 2px 4px rgba(0,0,0,0.05)',
      },
      children: [
        showPopup &&
          /* @__PURE__ */ jsxs('div', {
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255,255,255,0.98)',
              zIndex: 200,
              display: 'flex',
              flexDirection: 'column',
              padding: isMobile ? '8px' : '12px',
            },
            children: [
              /* @__PURE__ */ jsxs('div', {
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: isMobile ? '8px' : '12px',
                  alignItems: 'center',
                },
                children: [
                  /* @__PURE__ */ jsx2('span', {
                    style: {
                      fontWeight: '700',
                      fontSize: isMobile ? '10px' : '12px',
                      textTransform: 'uppercase',
                      color: '#666',
                    },
                    children: 'Pick Options',
                  }),
                  /* @__PURE__ */ jsx2('button', {
                    onClick: () => setShowPopup(false),
                    style: {
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: isMobile ? '18px' : '20px',
                      lineHeight: 1,
                    },
                    children: '\xD7',
                  }),
                ],
              }),
              /* @__PURE__ */ jsx2('div', {
                style: {
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: isMobile ? '6px' : '8px',
                },
                children: product.variants.map((v) =>
                  /* @__PURE__ */ jsx2(
                    'div',
                    {
                      onClick: () => {
                        handleVariantChange(product.id, v.id);
                        handleAddProduct(product, 1, v, source);
                        setShowPopup(false);
                      },
                      style: {
                        padding: isMobile ? '8px' : '10px',
                        border: '1px solid #eee',
                        borderRadius: '8px',
                        textAlign: 'center',
                        fontSize: isMobile ? '11px' : '13px',
                        fontWeight: '600',
                        background:
                          selectedVariantId === v.id
                            ? config.selection_highlight_color
                            : '#f9f9f9',
                        color: selectedVariantId === v.id ? '#fff' : '#333',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      },
                      children: v.title,
                    },
                    v.id
                  )
                ),
              }),
            ],
          }),
        isSelected &&
          config.show_selection_tick &&
          /* @__PURE__ */ jsx2('div', {
            style: {
              position: 'absolute',
              top: isMobile ? 4 : 8,
              right: isMobile ? 4 : 8,
              background: config.selection_highlight_color,
              color: 'white',
              width: isMobile ? 18 : 22,
              height: isMobile ? 18 : 22,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobile ? 10 : 12,
              zIndex: 2,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            },
            children: '\u2713',
          }),
        /* @__PURE__ */ jsxs('div', {
          style: {
            width: '100%',
            height: productImageHeight,
            background: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
          },
          children: [
            /* @__PURE__ */ jsx2('img', {
              src:
                selectedVariant?.image?.src ||
                selectedVariant?.image?.url ||
                product.image?.src ||
                product.featuredImage?.url ||
                'https://placehold.co/300x300?text=Product',
              alt: product.title,
              style: {
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              },
            }),
            hasVariants &&
              config.product_card_variants_display === 'hover' &&
              isHovered &&
              /* @__PURE__ */ jsx2('div', {
                style: {
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'rgba(255,255,255,0.95)',
                  padding: '10px',
                  borderTop: '1px solid #eee',
                  zIndex: 3,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                  maxHeight: '80px',
                  overflowY: 'auto',
                },
                children: product.variants.map((v) =>
                  /* @__PURE__ */ jsx2(
                    'div',
                    {
                      onClick: (e) => {
                        e.stopPropagation();
                        handleVariantChange(product.id, v.id);
                      },
                      style: {
                        fontSize: '10px',
                        padding: '2px 6px',
                        border:
                          selectedVariantId === v.id
                            ? `1px solid ${config.selection_highlight_color}`
                            : '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background:
                          selectedVariantId === v.id
                            ? config.selection_highlight_color
                            : 'white',
                        color: selectedVariantId === v.id ? 'white' : 'black',
                      },
                      children: v.title,
                    },
                    v.id
                  )
                ),
              }),
          ],
        }),
        /* @__PURE__ */ jsxs('div', {
          style: { padding: productCardPadding },
          children: [
            hasVariants &&
              config.product_card_variants_display === 'static' &&
              /* @__PURE__ */ jsx2('div', {
                style: { marginBottom: 10 },
                onClick: (e) => e.stopPropagation(),
                children: /* @__PURE__ */ jsx2(Select, {
                  label: 'Variant',
                  options: product.variants.map((v) => ({
                    label: v.title,
                    value: String(v.id),
                  })),
                  value: selectedVariantId ? String(selectedVariantId) : '',
                  onChange: (v) => handleVariantChange(product.id, v),
                }),
              }),
            /* @__PURE__ */ jsx2('div', {
              style: {
                fontWeight: 500,
                marginBottom: 4,
                fontSize: `${productTitleSize}px`,
              },
              children: product.title,
            }),
            /* @__PURE__ */ jsxs('div', {
              style: {
                fontWeight: 600,
                marginBottom: 8,
                fontSize: `${productPriceSize}px`,
              },
              children: ['Rs.', selectedVariant?.price || 0],
            }),
            /* @__PURE__ */ jsxs('div', {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: 6,
                borderTop: '1px solid #eee',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
              },
              children: [
                config.show_quantity_selector &&
                  /* @__PURE__ */ jsxs('div', {
                    style: { display: 'flex', gap: 4, alignItems: 'center' },
                    children: [
                      /* @__PURE__ */ jsx2('button', {
                        type: 'button',
                        onClick: (e) => {
                          e.stopPropagation();
                          handleDec(product.id, source);
                        },
                        style: {
                          width: 32,
                          height: 32,
                          border: '1px solid #ddd',
                          background: '#f9f9f9',
                          borderRadius: '4px 0 0 4px',
                          cursor: 'pointer',
                          fontSize: 18,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1,
                        },
                        children: '\u2212',
                      }),
                      /* @__PURE__ */ jsx2('input', {
                        type: 'number',
                        min: '1',
                        value: cardQtys[product.id] || 0,
                        onChange: (e) =>
                          handleQtyChange(product.id, e.target.value, source),
                        onClick: (e) => e.stopPropagation(),
                        style: {
                          width: 35,
                          height: 32,
                          border: '1px solid #ddd',
                          borderLeft: 'none',
                          borderRight: 'none',
                          textAlign: 'center',
                          fontWeight: 600,
                          fontSize: 14,
                          WebkitAppearance: 'none',
                          margin: 0,
                          outline: 'none',
                        },
                      }),
                      /* @__PURE__ */ jsx2('button', {
                        type: 'button',
                        onClick: (e) => {
                          e.stopPropagation();
                          handleInc(product.id, selectedVariant, source);
                        },
                        style: {
                          width: 32,
                          height: 32,
                          border: '1px solid #ddd',
                          background: '#f9f9f9',
                          borderRadius: '0 4px 4px 0',
                          cursor: 'pointer',
                          fontSize: 18,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1,
                        },
                        children: '+',
                      }),
                    ],
                  }),
                config.show_add_to_cart_btn &&
                  /* @__PURE__ */ jsx2('button', {
                    type: 'button',
                    onClick: (e) => {
                      e.stopPropagation();
                      onAddClick();
                    },
                    style: {
                      background: isSelected
                        ? '#ff4d4d'
                        : config.add_btn_bg ||
                          config.product_add_btn_color ||
                          '#000',
                      color: isSelected
                        ? '#fff'
                        : config.add_btn_text_color ||
                          config.product_add_btn_text_color ||
                          '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontWeight: config.product_add_btn_font_weight || 600,
                      fontSize: config.product_add_btn_font_size || 14,
                      marginLeft: 4,
                      transition: 'all 0.2s',
                    },
                    children:
                      config.add_btn_text ||
                      config.product_add_btn_text ||
                      'Add',
                  }),
              ],
            }),
          ],
        }),
      ],
    });
  };
  const renderProductsGrid = () => {
    if (isLoading) {
      return /* @__PURE__ */ jsxs('div', {
        style: { padding: '40px 20px', textAlign: 'center', color: '#999' },
        children: [
          /* @__PURE__ */ jsx2('div', {
            style: { fontSize: '24px', marginBottom: '8px' },
            children: '\u231B',
          }),
          /* @__PURE__ */ jsxs('p', {
            children: [
              'Loading products for ',
              activeTab === 'all' ? 'All' : activeTab,
              '...',
            ],
          }),
        ],
      });
    }
    const isSlider = config.grid_layout_type === 'slider';
    const filteredProducts = products || [];
    if (filteredProducts.length === 0) {
      return /* @__PURE__ */ jsx2('div', {
        style: { padding: '40px 20px', textAlign: 'center', color: '#999' },
        children: /* @__PURE__ */ jsx2('p', {
          children: 'No products found in this collection.',
        }),
      });
    }
    return /* @__PURE__ */ jsx2('div', {
      style: { width: `${config.grid_width || 100}%`, margin: '0 auto' },
      children: /* @__PURE__ */ jsxs('div', {
        style: { position: 'relative', width: '100%' },
        children: [
          isSlider &&
            /* @__PURE__ */ jsxs(Fragment, {
              children: [
                /* @__PURE__ */ jsx2('button', {
                  className: 'cdo-arrow-btn',
                  onClick: () =>
                    sliderRef.current?.scrollBy({
                      left: -300,
                      behavior: 'smooth',
                    }),
                  style: { left: '10px' },
                  children: '\u2190',
                }),
                /* @__PURE__ */ jsx2('button', {
                  className: 'cdo-arrow-btn',
                  onClick: () =>
                    sliderRef.current?.scrollBy({
                      left: 300,
                      behavior: 'smooth',
                    }),
                  style: { right: '10px' },
                  children: '\u2192',
                }),
              ],
            }),
          /* @__PURE__ */ jsx2('div', {
            ref: sliderRef,
            className: isSlider ? 'cdo-slider-horizontal' : 'cdo-grid-vertical',
            style: {
              display: isSlider ? 'flex' : 'grid',
              gridTemplateColumns: isSlider
                ? 'none'
                : `repeat(${effectiveColumns}, minmax(0, 1fr))`,
              flexDirection: isSlider ? 'row' : 'column',
              flexWrap: 'nowrap',
              gap: gridGap,
              paddingTop: config.products_padding_top,
              paddingBottom: config.products_padding_bottom,
              width: '100%',
              boxSizing: 'border-box',
              alignItems: 'stretch',
              marginTop: config.products_margin_top,
              marginBottom: config.products_margin_bottom,
              overflowX: isSlider ? 'auto' : 'visible',
              overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch',
              scrollSnapType: isSlider ? 'x mandatory' : 'none',
              paddingLeft: isSlider ? '20px' : '0',
              paddingRight: isSlider ? '20px' : '0',
              scrollbarWidth: 'none',
            },
            children: filteredProducts.map((product) =>
              /* @__PURE__ */ jsx2(
                'div',
                {
                  style: {
                    minWidth: isSlider
                      ? isMobile
                        ? '220px'
                        : '280px'
                      : 'auto',
                    width: isSlider ? (isMobile ? '220px' : '280px') : 'auto',
                    flexShrink: 0,
                    scrollSnapAlign: 'start',
                  },
                  children: /* @__PURE__ */ jsx2(ProductCardItem, {
                    product,
                    source: activeTab,
                  }),
                },
                product.id
              )
            ),
          }),
        ],
      }),
    });
  };
  let sectionOrder;
  const progressSec = config.show_progress_bar ? [renderProgressBar] : [];
  if (config.layout === 'layout2') {
    sectionOrder = [
      ...progressSec,
      renderBanner,
      renderTabs,
      renderPreviewBar,
      renderTitleDescription,
      renderProductsGrid,
    ];
  } else if (config.new_option_dropdown === 'option2') {
    sectionOrder = [
      ...progressSec,
      renderTitleDescription,
      renderBanner,
      renderTabs,
      renderPreviewBar,
      renderProductsGrid,
    ];
  } else if (config.new_option_dropdown === 'option3') {
    sectionOrder = [
      ...progressSec,
      renderProductsGrid,
      renderBanner,
      renderTabs,
      renderPreviewBar,
      renderTitleDescription,
    ];
  } else if (config.new_option_dropdown === 'option4') {
    sectionOrder = [
      ...progressSec,
      renderTitleDescription,
      renderBanner,
      renderTabs,
      renderPreviewBar,
      renderProductsGrid,
    ];
  } else if (config.new_option_dropdown === 'option5') {
    sectionOrder = [
      ...progressSec,
      renderBanner,
      renderTitleDescription,
      renderProductsGrid,
      renderPreviewBar,
    ];
  } else if (config.new_option_dropdown === 'option6') {
    sectionOrder = [
      ...progressSec,
      renderPreviewBar,
      renderBanner,
      renderTitleDescription,
      renderProductsGrid,
    ];
  } else if (
    config.new_option_dropdown === 'option7' ||
    config.layout === 'layout3'
  ) {
    sectionOrder = [
      ...progressSec,
      renderPreviewBar,
      renderBanner,
      renderTitleDescription,
      renderProductsGrid,
    ];
  } else if (
    config.new_option_dropdown === 'option8' ||
    config.layout === 'layout4'
  ) {
    sectionOrder = [
      ...progressSec,
      renderBanner,
      renderTitleDescription,
      renderProductsGrid,
      renderPreviewBar,
    ];
  } else if (config.new_option_dropdown === 'option9') {
    sectionOrder = [
      ...progressSec,
      renderPreviewBar,
      renderBanner,
      renderTitleDescription,
      renderProductsGrid,
    ];
  } else {
    sectionOrder = [
      ...progressSec,
      renderBanner,
      renderTabs,
      renderPreviewBar,
      renderTitleDescription,
      renderProductsGrid,
    ];
  }
  const renderGlobalStickyBar = () => {
    if (!config.show_sticky_preview_bar) return null;
    return /* @__PURE__ */ jsxs('div', {
      style: {
        position: 'sticky',
        bottom: 0,
        background: config.sticky_preview_bar_bg || '#fff',
        borderTop: config.layout === 'layout2' ? 'none' : '1px solid #eee',
        padding: config.sticky_preview_bar_padding,
        display: 'flex',
        flexDirection: config.layout === 'layout2' ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: config.layout === 'layout2' ? 'stretch' : 'center',
        boxShadow: '0 -8px 30px rgba(0,0,0,0.12)',
        zIndex: 50,
        width: config.sticky_preview_bar_full_width
          ? '100%'
          : config.sticky_preview_bar_width,
        boxSizing: 'border-box',
        color: config.sticky_preview_bar_text_color || '#333',
        borderRadius: config.layout === 'layout2' ? '30px 30px 0 0' : '0',
        backdropFilter: 'blur(15px)',
        marginTop: 'auto',
        minHeight: config.sticky_preview_bar_height,
      },
      children: [
        config.layout === 'layout2' &&
          /* @__PURE__ */ jsx2('div', {
            style: {
              marginBottom: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            },
          }),
        /* @__PURE__ */ jsxs('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          },
          children: [
            /* @__PURE__ */ jsxs('div', {
              style: {
                display: isMobile && totalItems > 3 ? 'none' : 'flex',
                gap: '8px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
              },
              children: [
                (() => {
                  const flattenedProducts = selectedProducts.flatMap((p) =>
                    Array(p.quantity || 0).fill(p)
                  );
                  return flattenedProducts.length > 0
                    ? flattenedProducts
                        .slice(0, isMobile ? 3 : 10)
                        .map((p, i) =>
                          /* @__PURE__ */ jsx2(
                            'div',
                            {
                              style: {
                                width: isMobile ? '36px' : '48px',
                                height: isMobile ? '36px' : '48px',
                                borderRadius: '6px',
                                border: '1px solid #eee',
                                overflow: 'hidden',
                                flexShrink: 0,
                                position: 'relative',
                              },
                              children: /* @__PURE__ */ jsx2('img', {
                                src: p.image,
                                alt: '',
                                style: {
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                },
                              }),
                            },
                            i
                          )
                        )
                    : null;
                })(),
                isMobile &&
                  totalItems > 3 &&
                  /* @__PURE__ */ jsxs('div', {
                    style: {
                      fontSize: '12px',
                      fontWeight: '700',
                      color: config.preview_text_color || '#333',
                    },
                    children: ['+', totalItems - 3],
                  }),
              ],
            }),
            /* @__PURE__ */ jsx2('div', {
              style: {
                borderLeft: '1px solid #eee',
                paddingLeft: isMobile ? '10px' : '16px',
                flexShrink: 0,
              },
              children: /* @__PURE__ */ jsxs('div', {
                style: { display: 'flex', flexDirection: 'column', gap: '2px' },
                children: [
                  /* @__PURE__ */ jsxs('div', {
                    style: {
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '6px',
                    },
                    children: [
                      totalItems >= discountThreshold &&
                        finalPrice < totalPrice &&
                        /* @__PURE__ */ jsxs('div', {
                          style: {
                            fontSize: isMobile ? '11px' : '13px',
                            color: '#999',
                            textDecoration: 'line-through',
                            opacity: 0.6,
                          },
                          children: ['Rs.', totalPrice.toFixed(2)],
                        }),
                      /* @__PURE__ */ jsxs('div', {
                        style: {
                          fontSize: isMobile ? '16px' : '20px',
                          fontWeight: '900',
                          color: config.selection_highlight_color || '#000',
                        },
                        children: ['Rs.', finalPrice.toFixed(2)],
                      }),
                    ],
                  }),
                  /* @__PURE__ */ jsx2('div', {
                    style: {
                      fontSize: isMobile ? '10px' : '12px',
                      color:
                        totalItems >= discountThreshold ? '#28a745' : '#888',
                      fontWeight: '700',
                      marginTop: '1px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    },
                    children:
                      totalItems >= discountThreshold
                        ? /* @__PURE__ */ jsxs(Fragment, {
                            children: [
                              /* @__PURE__ */ jsx2('span', {
                                style: { fontSize: isMobile ? '12px' : '14px' },
                                children: '\u{1F389}',
                              }),
                              config.discount_unlocked_text ||
                                'Discount Unlocked!',
                            ],
                          })
                        : /* @__PURE__ */ jsx2(Fragment, {
                            children:
                              totalItems > 0 &&
                              (
                                config.discount_motivation_text ||
                                'Add {{remaining}} more to get a discount'
                              ).replace(
                                '{{remaining}}',
                                Math.max(0, discountThreshold - totalItems)
                              ),
                          }),
                  }),
                ],
              }),
            }),
          ],
        }),
        /* @__PURE__ */ jsx2('button', {
          type: 'button',
          style: {
            background: config.selection_highlight_color,
            color: '#fff',
            border: 'none',
            padding: isMobile ? '10px 18px' : '12px 32px',
            borderRadius: '50px',
            fontWeight: '800',
            fontSize: isMobile ? '13px' : '15px',
            cursor: 'pointer',
            marginLeft: isMobile ? '12px' : '20px',
            whiteSpace: 'nowrap',
            transition: 'transform 0.2s',
          },
          children: isMobile ? 'Buy' : 'Checkout',
        }),
      ],
    });
  };
  if (config.layout === 'layout3') {
    const primaryColor = config.primary_color || '#20D060';
    const bgColor = '#eef2f7';
    const textColor = config.text_color || '#111';
    return /* @__PURE__ */ jsxs('div', {
      style: {
        background: bgColor,
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: textColor,
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        maxWidth: '480px',
        // App-like width constraint for preview
        margin: '0 auto',
      },
      children: [
        /* @__PURE__ */ jsxs('div', {
          style: { paddingBottom: '100px' },
          children: [
            ' ',
            config.show_hero !== false &&
              /* @__PURE__ */ jsx2('div', {
                style: { padding: '16px 20px' },
                children: /* @__PURE__ */ jsxs('div', {
                  style: {
                    background: '#fff',
                    borderRadius: '20px',
                    padding: '16px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                  },
                  children: [
                    /* @__PURE__ */ jsx2('div', {
                      style: {
                        background: primaryColor,
                        color: '#000',
                        fontSize: '10px',
                        fontWeight: '800',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        display: 'inline-block',
                        marginBottom: '12px',
                        textTransform: 'uppercase',
                      },
                      children: 'DEAL OF THE DAY',
                    }),
                    /* @__PURE__ */ jsx2('div', {
                      style: {
                        width: '100%',
                        height:
                          config.banner_fit_mode === 'adapt' ? 'auto' : '160px',
                        background: '#f9f9f9',
                        borderRadius: '12px',
                        marginBottom: '16px',
                        overflow: 'hidden',
                        position: 'relative',
                      },
                      children:
                        config.enable_banner_slider && banners.length > 1
                          ? /* @__PURE__ */ jsx2('div', {
                              style: {
                                width: '100%',
                                height: '100%',
                                position: 'relative',
                              },
                              children: banners.map((banner, idx) =>
                                /* @__PURE__ */ jsxs(
                                  'div',
                                  {
                                    style: {
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      width: '100%',
                                      height: '100%',
                                      opacity: currentSlide === idx ? 1 : 0,
                                      transition: 'opacity 0.8s ease-in-out',
                                      zIndex: currentSlide === idx ? 1 : 0,
                                    },
                                    children: [
                                      /* @__PURE__ */ jsx2('img', {
                                        src: banner.image,
                                        alt: banner.title,
                                        style: {
                                          width: '100%',
                                          height: '100%',
                                          objectFit: bannerObjectFit,
                                          display: 'block',
                                        },
                                      }),
                                      /* @__PURE__ */ jsxs('div', {
                                        style: {
                                          position: 'absolute',
                                          bottom: 0,
                                          left: 0,
                                          right: 0,
                                          background:
                                            'linear-gradient(transparent, rgba(0,0,0,0.7))',
                                          padding: '10px 15px',
                                          color: 'white',
                                        },
                                        children: [
                                          /* @__PURE__ */ jsx2('div', {
                                            style: {
                                              fontWeight: 'bold',
                                              fontSize: '14px',
                                            },
                                            children: banner.title,
                                          }),
                                          /* @__PURE__ */ jsx2('div', {
                                            style: {
                                              fontSize: '12px',
                                              opacity: 0.9,
                                            },
                                            children: banner.subtitle,
                                          }),
                                        ],
                                      }),
                                    ],
                                  },
                                  idx
                                )
                              ),
                            })
                          : /* @__PURE__ */ jsx2('img', {
                              src:
                                config.hero_image_url ||
                                'https://cdn.shopify.com/s/files/1/0070/7032/files/fresh-vegetables-and-fruits.jpg?v=1614349455',
                              alt: 'Hero',
                              style: {
                                width: '100%',
                                height:
                                  config.banner_fit_mode === 'adapt'
                                    ? 'auto'
                                    : '100%',
                                objectFit:
                                  config.banner_fit_mode === 'cover' ||
                                  config.banner_fit_mode === 'contain'
                                    ? config.banner_fit_mode
                                    : 'cover',
                                display: 'block',
                              },
                            }),
                    }),
                    /* @__PURE__ */ jsxs('div', {
                      style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '4px',
                      },
                      children: [
                        /* @__PURE__ */ jsx2('div', {
                          style: {
                            fontSize: '18px',
                            fontWeight: '800',
                            lineHeight: 1.2,
                            flex: 1,
                          },
                          children:
                            titles[bundleIndex] ||
                            config.hero_title ||
                            'Mega Breakfast Bundle',
                        }),
                        /* @__PURE__ */ jsx2('div', {
                          style: {
                            fontSize: '18px',
                            fontWeight: '800',
                            color: primaryColor,
                            marginLeft: '12px',
                          },
                          children: config.hero_price || '$14.99',
                        }),
                      ],
                    }),
                    /* @__PURE__ */ jsx2('div', {
                      style: {
                        fontSize: '12px',
                        textDecoration: 'line-through',
                        color: '#bbb',
                        textAlign: 'right',
                        marginTop: '-4px',
                        marginBottom: '8px',
                      },
                      children: config.hero_compare_price || '$24.50',
                    }),
                    /* @__PURE__ */ jsx2('div', {
                      style: {
                        fontSize: '12px',
                        color: '#888',
                        marginBottom: '16px',
                      },
                      children:
                        subtitles[bundleIndex] ||
                        config.hero_subtitle ||
                        'Milk, Bread, Eggs, Cereal & Juice',
                    }),
                    /* @__PURE__ */ jsxs('div', {
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '16px',
                        fontSize: '11px',
                        color: '#888',
                        fontWeight: '600',
                      },
                      children: [
                        'ENDS IN:',
                        /* @__PURE__ */ jsx2('span', {
                          style: {
                            background: '#eafff2',
                            color: primaryColor,
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontWeight: '700',
                            fontSize: '13px',
                          },
                          children: time.h,
                        }),
                        ' ',
                        ':',
                        /* @__PURE__ */ jsx2('span', {
                          style: {
                            background: '#eafff2',
                            color: primaryColor,
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontWeight: '700',
                            fontSize: '13px',
                          },
                          children: time.m,
                        }),
                        ' ',
                        ':',
                        /* @__PURE__ */ jsx2('span', {
                          style: {
                            background: '#eafff2',
                            color: primaryColor,
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontWeight: '700',
                            fontSize: '13px',
                          },
                          children: time.s,
                        }),
                      ],
                    }),
                    /* @__PURE__ */ jsxs('button', {
                      style: {
                        width: '100%',
                        background: primaryColor,
                        color: '#000',
                        border: 'none',
                        padding: '14px',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      },
                      children: [
                        '\u{1F6D2} ',
                        config.hero_btn_text || 'Add to Cart - Save 38%',
                      ],
                    }),
                  ],
                }),
              }),
            config.show_progress_bar &&
              /* @__PURE__ */ jsxs('div', {
                style: { padding: '0 20px 15px' },
                children: [
                  /* @__PURE__ */ jsxs('div', {
                    style: {
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      fontWeight: '800',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    },
                    children: [
                      /* @__PURE__ */ jsx2('span', {
                        style: { color: config.progress_bar_color || '#000' },
                        children:
                          config.progress_text ||
                          (totalItems < discountThreshold
                            ? `Add ${discountThreshold - totalItems} more for discount`
                            : 'Discount Unlocked!'),
                      }),
                      /* @__PURE__ */ jsxs('span', {
                        children: [
                          Math.min(
                            100,
                            Math.round((totalItems / discountThreshold) * 100)
                          ),
                          '%',
                        ],
                      }),
                    ],
                  }),
                  /* @__PURE__ */ jsx2('div', {
                    style: {
                      height: '6px',
                      background: 'rgba(0,0,0,0.05)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                    },
                    children: /* @__PURE__ */ jsx2('div', {
                      style: {
                        height: '100%',
                        width: `${Math.min(100, (totalItems / discountThreshold) * 100)}%`,
                        background: config.progress_bar_color || '#000',
                        transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: `0 0 10px ${config.progress_bar_color || '#000'}40`,
                      },
                    }),
                  }),
                ],
              }),
            /* @__PURE__ */ jsx2('div', {
              style: {
                display: 'flex',
                gap: '10px',
                overflowX: 'auto',
                padding: '8px 20px 20px',
                scrollbarWidth: 'none',
              },
              children: [1, 2, 3, 4]
                .map((i) => ({
                  handle: config[`col_${i}`],
                  title:
                    config[`title_${i}`] ||
                    (i === 1 ? 'All Packs' : `Category ${i}`),
                }))
                .filter((t) => t.handle || t.title)
                .map((tab, idx) => {
                  const isActive =
                    activeTab ===
                    (idx === 0 && config.show_tab_all !== false
                      ? 'all'
                      : tab.handle);
                  return /* @__PURE__ */ jsx2(
                    'div',
                    {
                      onClick: () =>
                        setActiveTab(
                          idx === 0 && config.show_tab_all !== false
                            ? 'all'
                            : tab.handle
                        ),
                      style: {
                        whiteSpace: 'nowrap',
                        padding: '8px 20px',
                        borderRadius: '20px',
                        backgroundColor: isActive
                          ? config.selection_highlight_color || primaryColor
                          : '#fff',
                        border: `1px solid ${isActive ? config.selection_highlight_color || primaryColor : '#eee'}`,
                        fontSize: '12px',
                        fontWeight: '600',
                        color: isActive ? '#fff' : '#333',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isActive
                          ? '0 4px 10px rgba(0,0,0,0.1)'
                          : 'none',
                      },
                      children: tab.title,
                    },
                    idx
                  );
                }),
            }),
            /* @__PURE__ */ jsxs('div', {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0 20px 12px',
              },
              children: [
                /* @__PURE__ */ jsx2('div', {
                  style: { fontSize: '16px', fontWeight: '700' },
                  children: 'Curated For You',
                }),
                /* @__PURE__ */ jsx2('div', {
                  style: {
                    fontSize: '12px',
                    color: primaryColor,
                    fontWeight: '600',
                    cursor: 'pointer',
                  },
                  children: 'View All',
                }),
              ],
            }),
            /* @__PURE__ */ jsx2('div', {
              style: {
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                padding: '0 20px 40px',
              },
              children: isLoading
                ? /* @__PURE__ */ jsx2('div', {
                    style: {
                      gridColumn: '1 / -1',
                      padding: '20px',
                      textAlign: 'center',
                    },
                    children: 'Loading products...',
                  })
                : shopifyProducts.slice(0, 6).map((product) => {
                    if (!product) return null;
                    const isSelected = selectedProducts.some(
                      (p) => String(p.id) === String(product.id)
                    );
                    const qty = cardQtys[product.id] || 0;
                    let price = '10.00';
                    if (product.variants) {
                      if (Array.isArray(product.variants)) {
                        price = product.variants[0]?.price || '10.00';
                      } else if (product.variants.nodes) {
                        price = product.variants.nodes[0]?.price || '10.00';
                      }
                    }
                    return /* @__PURE__ */ jsxs(
                      'div',
                      {
                        style: {
                          background: '#fff',
                          borderRadius: '12px',
                          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                          padding: '10px',
                          position: 'relative',
                          border: '1px solid #f0f0f0',
                        },
                        children: [
                          /* @__PURE__ */ jsx2('div', {
                            style: {
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              background: primaryColor,
                              color: '#000',
                              fontSize: '9px',
                              fontWeight: '700',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              zIndex: 2,
                            },
                            children: '-20%',
                          }),
                          /* @__PURE__ */ jsx2('div', {
                            style: {
                              width: '100%',
                              aspectRatio: '1',
                              borderRadius: '8px',
                              background: '#f9f9f9',
                              marginBottom: '10px',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            },
                            children: /* @__PURE__ */ jsx2('img', {
                              src:
                                product.featuredImage?.url ||
                                'https://placehold.co/300x300',
                              alt: product.title,
                              style: {
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                              },
                            }),
                          }),
                          /* @__PURE__ */ jsx2('div', {
                            style: {
                              fontSize: '13px',
                              fontWeight: '700',
                              lineHeight: 1.3,
                              marginBottom: '4px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            },
                            children: product.title,
                          }),
                          /* @__PURE__ */ jsx2('div', {
                            style: {
                              fontSize: '10px',
                              color: '#888',
                              marginBottom: '8px',
                            },
                            children: config.vendor || 'Brand',
                          }),
                          /* @__PURE__ */ jsx2('div', {
                            style: {
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '10px',
                            },
                            children: /* @__PURE__ */ jsx2('div', {
                              children: /* @__PURE__ */ jsxs('span', {
                                style: { fontSize: '14px', fontWeight: '800' },
                                children: ['Rs.', price],
                              }),
                            }),
                          }),
                          !isSelected
                            ? /* @__PURE__ */ jsx2('button', {
                                onClick: () => handleAddProduct(product),
                                style: {
                                  width: '100%',
                                  background: '#eafff2',
                                  color: '#1a1a1a',
                                  border: 'none',
                                  padding: '8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                },
                                children: 'Add to Cart',
                              })
                            : /* @__PURE__ */ jsxs('div', {
                                style: {
                                  display: 'flex',
                                  gap: 4,
                                  alignItems: 'center',
                                  width: '100%',
                                },
                                children: [
                                  /* @__PURE__ */ jsx2('button', {
                                    onClick: () => handleDec(product.id),
                                    style: {
                                      flex: 1,
                                      background: primaryColor,
                                      border: 'none',
                                      borderRadius: '4px',
                                      color: '#fff',
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                    },
                                    children: '-',
                                  }),
                                  /* @__PURE__ */ jsx2('span', {
                                    style: {
                                      fontSize: '12px',
                                      fontWeight: 'bold',
                                      padding: '0 4px',
                                    },
                                    children: qty,
                                  }),
                                  /* @__PURE__ */ jsx2('button', {
                                    onClick: () => handleInc(product.id),
                                    style: {
                                      flex: 1,
                                      background: primaryColor,
                                      border: 'none',
                                      borderRadius: '4px',
                                      color: '#fff',
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                    },
                                    children: '+',
                                  }),
                                ],
                              }),
                        ],
                      },
                      product.id
                    );
                  }),
            }),
          ],
        }),
        selectedProducts.length > 0 &&
          /* @__PURE__ */ jsxs('div', {
            style: {
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#1a1a1a',
              color: '#fff',
              width: 'calc(100% - 40px)',
              maxWidth: '440px',
              padding: '12px 20px',
              borderRadius: '50px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              zIndex: 500,
            },
            children: [
              /* @__PURE__ */ jsxs('div', {
                children: [
                  /* @__PURE__ */ jsx2('span', {
                    style: { fontSize: '12px', opacity: 0.8 },
                    children: 'Total',
                  }),
                  /* @__PURE__ */ jsx2('br', {}),
                  /* @__PURE__ */ jsxs('strong', {
                    style: { fontSize: '14px' },
                    children: [
                      'Rs.',
                      selectedProducts
                        .reduce(
                          (sum, p) => sum + p.price * (p.quantity || 0),
                          0
                        )
                        .toFixed(2),
                    ],
                  }),
                ],
              }),
              /* @__PURE__ */ jsx2('div', {
                style: {
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                },
                onClick: () => alert('Checkout'),
                children: 'View Cart \u2192',
              }),
            ],
          }),
      ],
    });
  }
  if (config.layout === 'layout1') {
    const allSteps = [1, 2, 3, 4, 5];
    const activeSteps = allSteps.filter((step) => {
      if (step === 1) return true;
      return config[`step_${step}_collection`] || config[`step_${step}_title`];
    });
    const totalItems2 = selectedProducts.reduce(
      (sum, p) => sum + (p.quantity || 0),
      0
    );
    const totalSteps = activeSteps.length;
    const discountThreshold2 = config.discount_threshold || 5;
    const percent =
      discountThreshold2 > 0
        ? Math.min(100, Math.round((totalItems2 / discountThreshold2) * 100))
        : 0;
    return /* @__PURE__ */ jsxs('div', {
      style: {
        background: '#fff',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: '#333',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      },
      children: [
        config.show_progress_bar &&
          /* @__PURE__ */ jsxs('div', {
            style: {
              background: '#fff',
              padding: '20px',
              position: 'sticky',
              top: 0,
              zIndex: 100,
              borderBottom: '1px solid #eee',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            },
            children: [
              /* @__PURE__ */ jsxs('div', {
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '14px',
                  fontWeight: '800',
                  marginBottom: '12px',
                },
                children: [
                  /* @__PURE__ */ jsx2('span', {
                    style: {
                      color: config.progress_bar_color || '#000',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      fontSize: '11px',
                    },
                    children: config.progress_text || 'Bundle Progress',
                  }),
                  /* @__PURE__ */ jsxs('span', {
                    style: { color: '#5c5f62' },
                    children: [percent, '%'],
                  }),
                ],
              }),
              /* @__PURE__ */ jsx2('div', {
                style: {
                  background: '#f1f2f3',
                  height: '12px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                },
                children: /* @__PURE__ */ jsxs('div', {
                  style: {
                    background: `linear-gradient(90deg, ${config.progress_bar_color || '#000'}, ${config.progress_bar_color || '#000'}cc)`,
                    height: '100%',
                    width: `${percent}%`,
                    transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    position: 'relative',
                    borderRadius: '10px',
                    boxShadow: `0 0 10px ${config.progress_bar_color || '#000'}40`,
                  },
                  children: [
                    /* @__PURE__ */ jsx2('div', {
                      style: {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background:
                          'linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)',
                        backgroundSize: '30px 30px',
                        opacity: 0.3,
                      },
                    }),
                    percent > 0 &&
                      /* @__PURE__ */ jsx2('div', {
                        style: {
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          height: '100%',
                          width: '4px',
                          background: '#fff',
                          boxShadow: `0 0 8px 2px #fff`,
                          opacity: 0.8,
                        },
                      }),
                  ],
                }),
              }),
              /* @__PURE__ */ jsx2('div', {
                style: {
                  marginTop: '12px',
                  fontSize: '13px',
                  color: '#6d7175',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                },
                children:
                  totalItems2 < discountThreshold2
                    ? /* @__PURE__ */ jsxs(Fragment, {
                        children: [
                          /* @__PURE__ */ jsx2('span', {
                            style: {
                              display: 'inline-block',
                              width: '16px',
                              height: '16px',
                              background: `${config.progress_bar_color || '#000'}15`,
                              borderRadius: '50%',
                              textAlign: 'center',
                              lineHeight: '16px',
                              fontSize: '10px',
                              color: config.progress_bar_color || '#000',
                            },
                            children: '!',
                          }),
                          /* @__PURE__ */ jsxs('span', {
                            children: [
                              'Add',
                              ' ',
                              /* @__PURE__ */ jsx2('strong', {
                                children: Math.max(
                                  0,
                                  discountThreshold2 - totalItems2
                                ),
                              }),
                              ' ',
                              'more for',
                              ' ',
                              /* @__PURE__ */ jsx2('strong', {
                                children:
                                  config.discount_text ||
                                  config.progress_text ||
                                  'Bundle Discount',
                              }),
                            ],
                          }),
                        ],
                      })
                    : /* @__PURE__ */ jsxs('span', {
                        style: {
                          color: '#008060',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        },
                        children: [
                          /* @__PURE__ */ jsx2('span', {
                            style: { fontSize: '14px' },
                            children: '\u{1F389}',
                          }),
                          ' Discount Unlocked!',
                        ],
                      }),
              }),
            ],
          }),
        config.show_banner !== false &&
          /* @__PURE__ */ jsx2('div', {
            style: {
              width: config.banner_full_width
                ? 'calc(100% + 40px)'
                : `${bannerWidth}%`,
              height: finalBannerHeight,
              margin: config.banner_full_width ? '0 -20px' : '0 auto',
              overflow: 'hidden',
              background:
                config.banner_image_url || config.banner_image_mobile_url
                  ? 'none'
                  : '#e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
            children:
              config.banner_image_url || config.banner_image_mobile_url
                ? /* @__PURE__ */ jsx2('img', {
                    src:
                      isMobile && config.banner_image_mobile_url
                        ? config.banner_image_mobile_url
                        : config.banner_image_url,
                    alt: 'Banner',
                    style: {
                      width: '100%',
                      height:
                        config.banner_fit_mode === 'adapt' ? 'auto' : '100%',
                      objectFit: bannerObjectFit,
                      display: 'block',
                    },
                  })
                : /* @__PURE__ */ jsx2('span', {
                    style: { color: '#999' },
                    children: 'Banner Image Placeholder',
                  }),
          }),
        config.show_title_description !== false &&
          /* @__PURE__ */ jsxs('div', {
            style: { padding: '24px 20px', textAlign: headingAlign },
            children: [
              /* @__PURE__ */ jsx2('h1', {
                style: {
                  fontSize: `${isMobile ? parseInt(config.heading_size || 28) * 0.8 : config.heading_size || 28}px`,
                  fontWeight: '800',
                  marginBottom: '10px',
                  color: config.heading_color || '#333',
                },
                children: config.collection_title || 'Create Your Combo',
              }),
              /* @__PURE__ */ jsx2('p', {
                style: {
                  color: config.description_color || '#666',
                  fontSize: `${config.description_size || 15}px`,
                  lineHeight: '1.5',
                  textAlign: descriptionAlign,
                },
                children:
                  config.collection_description ||
                  'Select items to build your perfect bundle.',
              }),
            ],
          }),
        /* @__PURE__ */ jsx2('div', {
          style: { padding: '20px', flex: 1 },
          children: activeSteps.map((step, index) => {
            const stepTitle =
              config[`step_${step}_title`] || `Category ${step}`;
            const stepSubtitle =
              config[`step_${step}_subtitle`] || 'Select your items';
            const isCompleted = selectedProducts.length > index;
            return /* @__PURE__ */ jsxs(
              'div',
              {
                style: { marginBottom: '40px' },
                children: [
                  /* @__PURE__ */ jsxs('div', {
                    style: { marginBottom: '16px' },
                    children: [
                      /* @__PURE__ */ jsxs('div', {
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        },
                        children: [
                          /* @__PURE__ */ jsx2('h3', {
                            style: { fontSize: '18px', fontWeight: '700' },
                            children: stepTitle,
                          }),
                          isCompleted &&
                            /* @__PURE__ */ jsx2('span', {
                              style: { color: '#28a745', fontWeight: 'bold' },
                              children: '\u2713',
                            }),
                        ],
                      }),
                      /* @__PURE__ */ jsx2('p', {
                        style: { fontSize: '13px', color: '#888' },
                        children: stepSubtitle,
                      }),
                    ],
                  }),
                  config.grid_layout_type === 'slider'
                    ? /* Slider Mockup */
                      /* @__PURE__ */ jsx2('div', {
                        style: {
                          display: 'flex',
                          gap: '12px',
                          overflowX: 'auto',
                          paddingBottom: '10px',
                          scrollbarWidth: 'none',
                        },
                        children: shopifyProducts.slice(0, 6).map((p) =>
                          /* @__PURE__ */ jsx2(
                            'div',
                            {
                              style: { minWidth: '160px', width: '160px' },
                              children: /* @__PURE__ */ jsx2(ProductCardItem, {
                                product: p,
                                source: `step_${step}`,
                              }),
                            },
                            p.id
                          )
                        ),
                      })
                    : /* Grid Layout */
                      /* @__PURE__ */ jsx2('div', {
                        style: {
                          display: 'grid',
                          gridTemplateColumns: `repeat(${device === 'desktop' ? config.desktop_columns || 3 : config.mobile_columns || 2}, minmax(0, 1fr))`,
                          gap: '16px',
                        },
                        children: shopifyProducts
                          .slice(0, 6)
                          .map((p) =>
                            /* @__PURE__ */ jsx2(
                              ProductCardItem,
                              { product: p, source: `step_${step}` },
                              p.id
                            )
                          ),
                      }),
                ],
              },
              step
            );
          }),
        }),
        renderGlobalStickyBar(),
      ],
    });
  }
  return /* @__PURE__ */ jsx2('div', {
    style: { background: '#eef1f5', padding: 16 },
    children: /* @__PURE__ */ jsxs('div', {
      style: {
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        paddingTop,
        paddingRight,
        paddingBottom,
        paddingLeft,
        background: '#f9f9f9',
        maxWidth: viewportWidth,
        margin: '0 auto',
        border: '1px solid #e5e5e5',
        borderRadius: 12,
        boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
        minHeight: '100%',
        position: 'relative',
      },
      children: [
        /* @__PURE__ */ jsx2('style', { children: previewStyles }),
        sectionOrder.map((Section, idx) =>
          /* @__PURE__ */ jsx2('div', { children: Section() }, idx)
        ),
        renderGlobalStickyBar(),
      ],
    }),
  });
}
export { action, Customize as default, loader };
