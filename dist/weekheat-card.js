// ../../../node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t5, e5, o7) {
    if (this._$cssResult$ = true, o7 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t5, this.t = e5;
  }
  get styleSheet() {
    let t5 = this.o;
    const s5 = this.t;
    if (e && void 0 === t5) {
      const e5 = void 0 !== s5 && 1 === s5.length;
      e5 && (t5 = o.get(s5)), void 0 === t5 && ((this.o = t5 = new CSSStyleSheet()).replaceSync(this.cssText), e5 && o.set(s5, t5));
    }
    return t5;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t5) => new n("string" == typeof t5 ? t5 : t5 + "", void 0, s);
var i = (t5, ...e5) => {
  const o7 = 1 === t5.length ? t5[0] : e5.reduce((e6, s5, o8) => e6 + ((t6) => {
    if (true === t6._$cssResult$) return t6.cssText;
    if ("number" == typeof t6) return t6;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t6 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s5) + t5[o8 + 1], t5[0]);
  return new n(o7, t5, s);
};
var S = (s5, o7) => {
  if (e) s5.adoptedStyleSheets = o7.map((t5) => t5 instanceof CSSStyleSheet ? t5 : t5.styleSheet);
  else for (const e5 of o7) {
    const o8 = document.createElement("style"), n6 = t.litNonce;
    void 0 !== n6 && o8.setAttribute("nonce", n6), o8.textContent = e5.cssText, s5.appendChild(o8);
  }
};
var c = e ? (t5) => t5 : (t5) => t5 instanceof CSSStyleSheet ? ((t6) => {
  let e5 = "";
  for (const s5 of t6.cssRules) e5 += s5.cssText;
  return r(e5);
})(t5) : t5;

// ../../../node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e2, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t5, s5) => t5;
var u = { toAttribute(t5, s5) {
  switch (s5) {
    case Boolean:
      t5 = t5 ? l : null;
      break;
    case Object:
    case Array:
      t5 = null == t5 ? t5 : JSON.stringify(t5);
  }
  return t5;
}, fromAttribute(t5, s5) {
  let i6 = t5;
  switch (s5) {
    case Boolean:
      i6 = null !== t5;
      break;
    case Number:
      i6 = null === t5 ? null : Number(t5);
      break;
    case Object:
    case Array:
      try {
        i6 = JSON.parse(t5);
      } catch (t6) {
        i6 = null;
      }
  }
  return i6;
} };
var f = (t5, s5) => !i2(t5, s5);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t5) {
    this._$Ei(), (this.l ??= []).push(t5);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t5, s5 = b) {
    if (s5.state && (s5.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t5) && ((s5 = Object.create(s5)).wrapped = true), this.elementProperties.set(t5, s5), !s5.noAccessor) {
      const i6 = Symbol(), h4 = this.getPropertyDescriptor(t5, i6, s5);
      void 0 !== h4 && e2(this.prototype, t5, h4);
    }
  }
  static getPropertyDescriptor(t5, s5, i6) {
    const { get: e5, set: r6 } = h(this.prototype, t5) ?? { get() {
      return this[s5];
    }, set(t6) {
      this[s5] = t6;
    } };
    return { get: e5, set(s6) {
      const h4 = e5?.call(this);
      r6?.call(this, s6), this.requestUpdate(t5, h4, i6);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t5) {
    return this.elementProperties.get(t5) ?? b;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d("elementProperties"))) return;
    const t5 = n2(this);
    t5.finalize(), void 0 !== t5.l && (this.l = [...t5.l]), this.elementProperties = new Map(t5.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
      const t6 = this.properties, s5 = [...r2(t6), ...o2(t6)];
      for (const i6 of s5) this.createProperty(i6, t6[i6]);
    }
    const t5 = this[Symbol.metadata];
    if (null !== t5) {
      const s5 = litPropertyMetadata.get(t5);
      if (void 0 !== s5) for (const [t6, i6] of s5) this.elementProperties.set(t6, i6);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t6, s5] of this.elementProperties) {
      const i6 = this._$Eu(t6, s5);
      void 0 !== i6 && this._$Eh.set(i6, t6);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s5) {
    const i6 = [];
    if (Array.isArray(s5)) {
      const e5 = new Set(s5.flat(1 / 0).reverse());
      for (const s6 of e5) i6.unshift(c(s6));
    } else void 0 !== s5 && i6.push(c(s5));
    return i6;
  }
  static _$Eu(t5, s5) {
    const i6 = s5.attribute;
    return false === i6 ? void 0 : "string" == typeof i6 ? i6 : "string" == typeof t5 ? t5.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t5) => this.enableUpdating = t5), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t5) => t5(this));
  }
  addController(t5) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t5), void 0 !== this.renderRoot && this.isConnected && t5.hostConnected?.();
  }
  removeController(t5) {
    this._$EO?.delete(t5);
  }
  _$E_() {
    const t5 = /* @__PURE__ */ new Map(), s5 = this.constructor.elementProperties;
    for (const i6 of s5.keys()) this.hasOwnProperty(i6) && (t5.set(i6, this[i6]), delete this[i6]);
    t5.size > 0 && (this._$Ep = t5);
  }
  createRenderRoot() {
    const t5 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t5, this.constructor.elementStyles), t5;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t5) => t5.hostConnected?.());
  }
  enableUpdating(t5) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t5) => t5.hostDisconnected?.());
  }
  attributeChangedCallback(t5, s5, i6) {
    this._$AK(t5, i6);
  }
  _$ET(t5, s5) {
    const i6 = this.constructor.elementProperties.get(t5), e5 = this.constructor._$Eu(t5, i6);
    if (void 0 !== e5 && true === i6.reflect) {
      const h4 = (void 0 !== i6.converter?.toAttribute ? i6.converter : u).toAttribute(s5, i6.type);
      this._$Em = t5, null == h4 ? this.removeAttribute(e5) : this.setAttribute(e5, h4), this._$Em = null;
    }
  }
  _$AK(t5, s5) {
    const i6 = this.constructor, e5 = i6._$Eh.get(t5);
    if (void 0 !== e5 && this._$Em !== e5) {
      const t6 = i6.getPropertyOptions(e5), h4 = "function" == typeof t6.converter ? { fromAttribute: t6.converter } : void 0 !== t6.converter?.fromAttribute ? t6.converter : u;
      this._$Em = e5;
      const r6 = h4.fromAttribute(s5, t6.type);
      this[e5] = r6 ?? this._$Ej?.get(e5) ?? r6, this._$Em = null;
    }
  }
  requestUpdate(t5, s5, i6, e5 = false, h4) {
    if (void 0 !== t5) {
      const r6 = this.constructor;
      if (false === e5 && (h4 = this[t5]), i6 ??= r6.getPropertyOptions(t5), !((i6.hasChanged ?? f)(h4, s5) || i6.useDefault && i6.reflect && h4 === this._$Ej?.get(t5) && !this.hasAttribute(r6._$Eu(t5, i6)))) return;
      this.C(t5, s5, i6);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t5, s5, { useDefault: i6, reflect: e5, wrapped: h4 }, r6) {
    i6 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t5) && (this._$Ej.set(t5, r6 ?? s5 ?? this[t5]), true !== h4 || void 0 !== r6) || (this._$AL.has(t5) || (this.hasUpdated || i6 || (s5 = void 0), this._$AL.set(t5, s5)), true === e5 && this._$Em !== t5 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t5));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t6) {
      Promise.reject(t6);
    }
    const t5 = this.scheduleUpdate();
    return null != t5 && await t5, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t7, s6] of this._$Ep) this[t7] = s6;
        this._$Ep = void 0;
      }
      const t6 = this.constructor.elementProperties;
      if (t6.size > 0) for (const [s6, i6] of t6) {
        const { wrapped: t7 } = i6, e5 = this[s6];
        true !== t7 || this._$AL.has(s6) || void 0 === e5 || this.C(s6, void 0, i6, e5);
      }
    }
    let t5 = false;
    const s5 = this._$AL;
    try {
      t5 = this.shouldUpdate(s5), t5 ? (this.willUpdate(s5), this._$EO?.forEach((t6) => t6.hostUpdate?.()), this.update(s5)) : this._$EM();
    } catch (s6) {
      throw t5 = false, this._$EM(), s6;
    }
    t5 && this._$AE(s5);
  }
  willUpdate(t5) {
  }
  _$AE(t5) {
    this._$EO?.forEach((t6) => t6.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t5)), this.updated(t5);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t5) {
    return true;
  }
  update(t5) {
    this._$Eq &&= this._$Eq.forEach((t6) => this._$ET(t6, this[t6])), this._$EM();
  }
  updated(t5) {
  }
  firstUpdated(t5) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ??= []).push("2.1.2");

// ../../../node_modules/lit-html/lit-html.js
var t2 = globalThis;
var i3 = (t5) => t5;
var s2 = t2.trustedTypes;
var e3 = s2 ? s2.createPolicy("lit-html", { createHTML: (t5) => t5 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t5) => null === t5 || "object" != typeof t5 && "function" != typeof t5;
var u2 = Array.isArray;
var d2 = (t5) => u2(t5) || "function" == typeof t5?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t5) => (i6, ...s5) => ({ _$litType$: t5, strings: i6, values: s5 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = Symbol.for("lit-noChange");
var A = Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t5, i6) {
  if (!u2(t5) || !t5.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e3 ? e3.createHTML(i6) : i6;
}
var N = (t5, i6) => {
  const s5 = t5.length - 1, e5 = [];
  let n6, l3 = 2 === i6 ? "<svg>" : 3 === i6 ? "<math>" : "", c5 = v;
  for (let i7 = 0; i7 < s5; i7++) {
    const s6 = t5[i7];
    let a3, u3, d3 = -1, f4 = 0;
    for (; f4 < s6.length && (c5.lastIndex = f4, u3 = c5.exec(s6), null !== u3); ) f4 = c5.lastIndex, c5 === v ? "!--" === u3[1] ? c5 = _ : void 0 !== u3[1] ? c5 = m : void 0 !== u3[2] ? (y2.test(u3[2]) && (n6 = RegExp("</" + u3[2], "g")), c5 = p2) : void 0 !== u3[3] && (c5 = p2) : c5 === p2 ? ">" === u3[0] ? (c5 = n6 ?? v, d3 = -1) : void 0 === u3[1] ? d3 = -2 : (d3 = c5.lastIndex - u3[2].length, a3 = u3[1], c5 = void 0 === u3[3] ? p2 : '"' === u3[3] ? $ : g) : c5 === $ || c5 === g ? c5 = p2 : c5 === _ || c5 === m ? c5 = v : (c5 = p2, n6 = void 0);
    const x2 = c5 === p2 && t5[i7 + 1].startsWith("/>") ? " " : "";
    l3 += c5 === v ? s6 + r3 : d3 >= 0 ? (e5.push(a3), s6.slice(0, d3) + h2 + s6.slice(d3) + o3 + x2) : s6 + o3 + (-2 === d3 ? i7 : x2);
  }
  return [V(t5, l3 + (t5[s5] || "<?>") + (2 === i6 ? "</svg>" : 3 === i6 ? "</math>" : "")), e5];
};
var S2 = class _S {
  constructor({ strings: t5, _$litType$: i6 }, e5) {
    let r6;
    this.parts = [];
    let l3 = 0, a3 = 0;
    const u3 = t5.length - 1, d3 = this.parts, [f4, v2] = N(t5, i6);
    if (this.el = _S.createElement(f4, e5), P.currentNode = this.el.content, 2 === i6 || 3 === i6) {
      const t6 = this.el.content.firstChild;
      t6.replaceWith(...t6.childNodes);
    }
    for (; null !== (r6 = P.nextNode()) && d3.length < u3; ) {
      if (1 === r6.nodeType) {
        if (r6.hasAttributes()) for (const t6 of r6.getAttributeNames()) if (t6.endsWith(h2)) {
          const i7 = v2[a3++], s5 = r6.getAttribute(t6).split(o3), e6 = /([.?@])?(.*)/.exec(i7);
          d3.push({ type: 1, index: l3, name: e6[2], strings: s5, ctor: "." === e6[1] ? I : "?" === e6[1] ? L : "@" === e6[1] ? z : H }), r6.removeAttribute(t6);
        } else t6.startsWith(o3) && (d3.push({ type: 6, index: l3 }), r6.removeAttribute(t6));
        if (y2.test(r6.tagName)) {
          const t6 = r6.textContent.split(o3), i7 = t6.length - 1;
          if (i7 > 0) {
            r6.textContent = s2 ? s2.emptyScript : "";
            for (let s5 = 0; s5 < i7; s5++) r6.append(t6[s5], c3()), P.nextNode(), d3.push({ type: 2, index: ++l3 });
            r6.append(t6[i7], c3());
          }
        }
      } else if (8 === r6.nodeType) if (r6.data === n3) d3.push({ type: 2, index: l3 });
      else {
        let t6 = -1;
        for (; -1 !== (t6 = r6.data.indexOf(o3, t6 + 1)); ) d3.push({ type: 7, index: l3 }), t6 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t5, i6) {
    const s5 = l2.createElement("template");
    return s5.innerHTML = t5, s5;
  }
};
function M(t5, i6, s5 = t5, e5) {
  if (i6 === E) return i6;
  let h4 = void 0 !== e5 ? s5._$Co?.[e5] : s5._$Cl;
  const o7 = a2(i6) ? void 0 : i6._$litDirective$;
  return h4?.constructor !== o7 && (h4?._$AO?.(false), void 0 === o7 ? h4 = void 0 : (h4 = new o7(t5), h4._$AT(t5, s5, e5)), void 0 !== e5 ? (s5._$Co ??= [])[e5] = h4 : s5._$Cl = h4), void 0 !== h4 && (i6 = M(t5, h4._$AS(t5, i6.values), h4, e5)), i6;
}
var R = class {
  constructor(t5, i6) {
    this._$AV = [], this._$AN = void 0, this._$AD = t5, this._$AM = i6;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t5) {
    const { el: { content: i6 }, parts: s5 } = this._$AD, e5 = (t5?.creationScope ?? l2).importNode(i6, true);
    P.currentNode = e5;
    let h4 = P.nextNode(), o7 = 0, n6 = 0, r6 = s5[0];
    for (; void 0 !== r6; ) {
      if (o7 === r6.index) {
        let i7;
        2 === r6.type ? i7 = new k(h4, h4.nextSibling, this, t5) : 1 === r6.type ? i7 = new r6.ctor(h4, r6.name, r6.strings, this, t5) : 6 === r6.type && (i7 = new Z(h4, this, t5)), this._$AV.push(i7), r6 = s5[++n6];
      }
      o7 !== r6?.index && (h4 = P.nextNode(), o7++);
    }
    return P.currentNode = l2, e5;
  }
  p(t5) {
    let i6 = 0;
    for (const s5 of this._$AV) void 0 !== s5 && (void 0 !== s5.strings ? (s5._$AI(t5, s5, i6), i6 += s5.strings.length - 2) : s5._$AI(t5[i6])), i6++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t5, i6, s5, e5) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t5, this._$AB = i6, this._$AM = s5, this.options = e5, this._$Cv = e5?.isConnected ?? true;
  }
  get parentNode() {
    let t5 = this._$AA.parentNode;
    const i6 = this._$AM;
    return void 0 !== i6 && 11 === t5?.nodeType && (t5 = i6.parentNode), t5;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t5, i6 = this) {
    t5 = M(this, t5, i6), a2(t5) ? t5 === A || null == t5 || "" === t5 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t5 !== this._$AH && t5 !== E && this._(t5) : void 0 !== t5._$litType$ ? this.$(t5) : void 0 !== t5.nodeType ? this.T(t5) : d2(t5) ? this.k(t5) : this._(t5);
  }
  O(t5) {
    return this._$AA.parentNode.insertBefore(t5, this._$AB);
  }
  T(t5) {
    this._$AH !== t5 && (this._$AR(), this._$AH = this.O(t5));
  }
  _(t5) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t5 : this.T(l2.createTextNode(t5)), this._$AH = t5;
  }
  $(t5) {
    const { values: i6, _$litType$: s5 } = t5, e5 = "number" == typeof s5 ? this._$AC(t5) : (void 0 === s5.el && (s5.el = S2.createElement(V(s5.h, s5.h[0]), this.options)), s5);
    if (this._$AH?._$AD === e5) this._$AH.p(i6);
    else {
      const t6 = new R(e5, this), s6 = t6.u(this.options);
      t6.p(i6), this.T(s6), this._$AH = t6;
    }
  }
  _$AC(t5) {
    let i6 = C.get(t5.strings);
    return void 0 === i6 && C.set(t5.strings, i6 = new S2(t5)), i6;
  }
  k(t5) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i6 = this._$AH;
    let s5, e5 = 0;
    for (const h4 of t5) e5 === i6.length ? i6.push(s5 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s5 = i6[e5], s5._$AI(h4), e5++;
    e5 < i6.length && (this._$AR(s5 && s5._$AB.nextSibling, e5), i6.length = e5);
  }
  _$AR(t5 = this._$AA.nextSibling, s5) {
    for (this._$AP?.(false, true, s5); t5 !== this._$AB; ) {
      const s6 = i3(t5).nextSibling;
      i3(t5).remove(), t5 = s6;
    }
  }
  setConnected(t5) {
    void 0 === this._$AM && (this._$Cv = t5, this._$AP?.(t5));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t5, i6, s5, e5, h4) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t5, this.name = i6, this._$AM = e5, this.options = h4, s5.length > 2 || "" !== s5[0] || "" !== s5[1] ? (this._$AH = Array(s5.length - 1).fill(new String()), this.strings = s5) : this._$AH = A;
  }
  _$AI(t5, i6 = this, s5, e5) {
    const h4 = this.strings;
    let o7 = false;
    if (void 0 === h4) t5 = M(this, t5, i6, 0), o7 = !a2(t5) || t5 !== this._$AH && t5 !== E, o7 && (this._$AH = t5);
    else {
      const e6 = t5;
      let n6, r6;
      for (t5 = h4[0], n6 = 0; n6 < h4.length - 1; n6++) r6 = M(this, e6[s5 + n6], i6, n6), r6 === E && (r6 = this._$AH[n6]), o7 ||= !a2(r6) || r6 !== this._$AH[n6], r6 === A ? t5 = A : t5 !== A && (t5 += (r6 ?? "") + h4[n6 + 1]), this._$AH[n6] = r6;
    }
    o7 && !e5 && this.j(t5);
  }
  j(t5) {
    t5 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t5 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t5) {
    this.element[this.name] = t5 === A ? void 0 : t5;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t5) {
    this.element.toggleAttribute(this.name, !!t5 && t5 !== A);
  }
};
var z = class extends H {
  constructor(t5, i6, s5, e5, h4) {
    super(t5, i6, s5, e5, h4), this.type = 5;
  }
  _$AI(t5, i6 = this) {
    if ((t5 = M(this, t5, i6, 0) ?? A) === E) return;
    const s5 = this._$AH, e5 = t5 === A && s5 !== A || t5.capture !== s5.capture || t5.once !== s5.once || t5.passive !== s5.passive, h4 = t5 !== A && (s5 === A || e5);
    e5 && this.element.removeEventListener(this.name, this, s5), h4 && this.element.addEventListener(this.name, this, t5), this._$AH = t5;
  }
  handleEvent(t5) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t5) : this._$AH.handleEvent(t5);
  }
};
var Z = class {
  constructor(t5, i6, s5) {
    this.element = t5, this.type = 6, this._$AN = void 0, this._$AM = i6, this.options = s5;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t5) {
    M(this, t5);
  }
};
var j = { M: h2, P: o3, A: n3, C: 1, L: N, R, D: d2, V: M, I: k, H, N: L, U: z, B: I, F: Z };
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.3");
var D = (t5, i6, s5) => {
  const e5 = s5?.renderBefore ?? i6;
  let h4 = e5._$litPart$;
  if (void 0 === h4) {
    const t6 = s5?.renderBefore ?? null;
    e5._$litPart$ = h4 = new k(i6.insertBefore(c3(), t6), t6, void 0, s5 ?? {});
  }
  return h4._$AI(t5), h4;
};

// ../../../node_modules/lit-element/lit-element.js
var s3 = globalThis;
var i4 = class extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t5 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t5.firstChild, t5;
  }
  update(t5) {
    const r6 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t5), this._$Do = D(r6, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(false);
  }
  render() {
    return E;
  }
};
i4._$litElement$ = true, i4["finalized"] = true, s3.litElementHydrateSupport?.({ LitElement: i4 });
var o4 = s3.litElementPolyfillSupport;
o4?.({ LitElement: i4 });
(s3.litElementVersions ??= []).push("4.2.2");

// src/domain/constants.js
var WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
var SCHEDULE_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];
var DAY_MINUTES = 1440;
var MIN_T = 5;
var MAX_T = 30;
var OFF_T = 5;
var SAME_SETPOINT = 0.25;
var SAME_SHOWN = 0.05;
var HEATING_MARGIN = 0.2;
var PLAN_STEP = 0.5;
var DEFAULT_STEP = 0.5;
var NEW_PERIOD_T = 20;
var ON_AGAIN_T = 18;
var LIMITS = {
  window_delay: { min: 0, max: 900, initial: 30 },
  room_margin: { min: 0.1, max: 3, initial: 0.5, step: 0.1 },
  exercise_wait: { min: 10, max: 600, initial: 60 }
};
var STATE_MAX = 255;
var WINDOW_CLASSES = ["window", "door", "opening", "garage_door"];
var ROOM_BLUEPRINT = "weekheat_room.yaml";
var DAY_BLUEPRINT = "weekheat_day.yaml";
var EXERCISE_BLUEPRINT = "weekheat_exercise.yaml";
var EXERCISE_SCRIPT = "script.weekheat_exercise";
var EXERCISE_ALIAS = "Weekheat valve exercise";
var BLUEPRINT_FOLDER = "ekienmeier";
var BLUEPRINT_REPO = "https://github.com/ekienmeier/weekheat-card/blob/";
var DIRECTORY_KEY = "weekheat";
var UNAVAILABLE = ["unavailable", "unknown"];

// src/config.js
var DEFAULTS = {
  days: 14,
  day_script: "script.weekheat_day",
  layout: "dial",
  dial_min: MIN_T,
  dial_max: MAX_T
};
var MAX_DAYS = 62;
var CHECKS = [
  [
    (settings) => ["dial", "compact"].includes(settings.layout),
    'layout must be "dial" or "compact"'
  ],
  [(settings) => isDayCount(settings.days), `days must be a whole number from 1 to ${MAX_DAYS}`],
  [(settings) => String(settings.day_script).startsWith("script."), "day_script must be a script"],
  [(settings) => isRange(settings.dial_min, settings.dial_max), "dial_min must be below dial_max"],
  [
    (settings) => settings.rooms === void 0 || Array.isArray(settings.rooms),
    "rooms must be a list"
  ]
];
function isDayCount(days) {
  return Number.isInteger(days) && Number(days) >= 1 && Number(days) <= MAX_DAYS;
}
function isRange(low, high) {
  return typeof low === "number" && typeof high === "number" && low < high;
}
function problemOf(settings) {
  return CHECKS.find(([check]) => !check(settings))?.[1] || "";
}
function cardConfig(config) {
  const settings = { ...DEFAULTS, ...config };
  const problem = problemOf(settings);
  if (problem) throw new Error(`Weekheat: ${problem}.`);
  return (
    /** @type {any} */
    settings
  );
}

// src/domain/errors.js
function errorText(error) {
  if (!error || typeof error !== "object") return String(error);
  return error.message || error.body?.message || error.error || JSON.stringify(error);
}
function isNotFound(error) {
  return error?.status_code === 404;
}
var CardError = class extends Error {
  /**
   * @param {string} code e.g. "state_size"
   * @param {Record<string, string | number>} [values] e.g. {size: 260, max: 255}
   */
  constructor(code, values = {}) {
    super(code);
    this.code = code;
    this.values = values;
  }
};

// src/domain/room.js
var DIRECTORY_FIELDS = [
  "entity",
  "id",
  "name",
  "thermostats",
  "plans",
  "week",
  "free_day",
  "state",
  "windows",
  "window_delay",
  "heating_switch",
  "room_sensor",
  "room_margin"
];
var EXERCISE_DEFAULTS = {
  exercise_day: "off",
  exercise_time: "13:00:00",
  exercise_wait: 60
};
function asList(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}
function roomFromInput(input, alias) {
  return {
    name: input.room_name || alias,
    thermostats: asList(input.thermostats),
    plans: asList(input.plans),
    week: input.week || {},
    free_day: input.free_day,
    state: input.state,
    windows: asList(input.windows),
    window_delay: input.window_delay ?? LIMITS.window_delay.initial,
    heating_switch: asList(input.heating_switch)[0] || null,
    room_sensor: asList(input.room_sensor)[0] || null,
    room_margin: input.room_margin ?? LIMITS.room_margin.initial
  };
}
function exerciseFromInput(input = {}) {
  const pairs = Object.entries(EXERCISE_DEFAULTS).map(([key, initial]) => [
    key,
    input[key] ?? initial
  ]);
  return (
    /** @type {any} */
    Object.fromEntries(pairs)
  );
}
function directoryEntry(room) {
  return Object.fromEntries(DIRECTORY_FIELDS.map((key) => [key, room[key] ?? null]));
}
function stateSize(thermostats) {
  const widest = 22.5;
  const state = Object.fromEntries(thermostats.map((entity) => [entity, [widest]]));
  const saved = { _open: thermostats.map(() => widest), _th: 999999 };
  const markers = { ...saved, _rc: 1, _rt: 99999999, _ex: 1 };
  return JSON.stringify({ ...state, ...markers }).length;
}
function checkStateSize(thermostats) {
  const size = stateSize(thermostats);
  if (size > STATE_MAX) throw new CardError("state_size", { size, max: STATE_MAX });
}

// src/ha/directory.js
function makeDirectory({ rooms: rooms2, script, exceptions }) {
  return { v: 1, script, exceptions, rooms: rooms2.map(directoryEntry) };
}
async function readDirectory(gateway) {
  const data = await gateway.ws({ type: "frontend/get_system_data", key: DIRECTORY_KEY });
  const directory = data?.value;
  return directory && Array.isArray(directory.rooms) ? directory : null;
}
async function publishDirectory(gateway, directory) {
  const current = await readDirectory(gateway);
  if (JSON.stringify(current) === JSON.stringify(directory)) return false;
  await gateway.ws({ type: "frontend/set_system_data", key: DIRECTORY_KEY, value: directory });
  return true;
}
function watchDirectory(gateway, onChange) {
  let first = true;
  const message2 = { type: "frontend/subscribe_system_data", key: DIRECTORY_KEY };
  return gateway.subscribe(message2, () => {
    if (!first) onChange();
    first = false;
  });
}

// src/ha/gateway.js
var Gateway = class {
  /**
   * @param {any} [hass] Home Assistant's object for the card
   */
  constructor(hass = null) {
    this.hass = hass;
  }
  /**
   * Use a newer `hass` object: Home Assistant gives the card a new one on every state change.
   * @param {any} hass
   */
  use(hass) {
    this.hass = hass;
  }
  /**
   * Every entity's state.
   * @returns {Record<string, import('../domain/room-status.js').HassState>}
   */
  get states() {
    return this.hass.states;
  }
  /**
   * Is the user an administrator? Only they may read and change configurations.
   * @returns {boolean}
   */
  get isAdmin() {
    return Boolean(this.hass.user?.is_admin);
  }
  /**
   * Send a WebSocket command.
   * @param {Record<string, unknown>} message
   * @returns {Promise<any>} its result
   */
  ws(message2) {
    return this.hass.callWS(message2);
  }
  /**
   * A configuration from the config API, or null if there is none (404); other failures reject.
   * @param {string} path the part after `config/`, e.g. "script/config/weekheat_day"
   * @returns {Promise<any>}
   */
  async readConfig(path) {
    try {
      return await this.hass.callApi("GET", `config/${path}`);
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }
  /**
   * Save a configuration with the config API.
   * @param {string} path see readConfig
   * @param {object} config
   * @returns {Promise<unknown>}
   */
  saveConfig(path, config) {
    return this.hass.callApi("POST", `config/${path}`, config);
  }
  /**
   * Delete a configuration with the config API.
   * @param {string} path see readConfig
   * @returns {Promise<unknown>}
   */
  deleteConfig(path) {
    return this.hass.callApi("DELETE", `config/${path}`);
  }
  /**
   * Read a REST endpoint, e.g. a calendar's events.
   * @param {string} path the part after `/api/`
   * @returns {Promise<any>}
   */
  get(path) {
    return this.hass.callApi("GET", path);
  }
  /**
   * Call a service.
   * @param {string} domain
   * @param {string} service
   * @param {Record<string, unknown>} [data]
   * @returns {Promise<unknown>}
   */
  service(domain, service, data = {}) {
    return this.hass.callService(domain, service, data);
  }
  /**
   * Run a script and return its response.
   * @param {string} entity the script, e.g. "script.weekheat_day"
   * @param {Record<string, unknown>} data its fields
   * @returns {Promise<any>}
   */
  async runScript(entity, data) {
    const service = entity.replace(/^script\./, "");
    const call = { domain: "script", service, service_data: data, return_response: true };
    const answer = await this.ws({ type: "call_service", ...call });
    return answer.response;
  }
  /**
   * Subscribe to messages of a WebSocket command.
   * @param {Record<string, unknown>} message the subscription command
   * @param {(message: any) => void} callback gets every message
   * @returns {Promise<() => void>} resolves with the function that ends the subscription
   */
  subscribe(message2, callback) {
    return this.hass.connection.subscribeMessage(callback, message2);
  }
};

// src/ha/notifications.js
function subscribeNotifications(gateway, onChange) {
  const notes2 = {};
  return gateway.subscribe({ type: "persistent_notification/subscribe" }, (message2) => {
    const changed = Object.keys(message2.notifications || {});
    if (message2.type === "removed") changed.forEach((id) => delete notes2[id]);
    else Object.assign(notes2, message2.notifications);
    onChange({ ...notes2 });
  });
}
function weekheatNotes(notes2) {
  return Object.values(notes2).filter(
    (note) => String(note.notification_id).startsWith("weekheat_")
  );
}
function dismissNotification(gateway, id) {
  return gateway.service("persistent_notification", "dismiss", { notification_id: id });
}

// src/state/actions/messages.js
var SHOWN_MS = { ok: 2500, bad: 8e3 };
function flash(ctx, message2) {
  ctx.store.update((store) => store.ui.message = message2);
  clearTimeout(ctx.timers.message);
  const hide = () => ctx.store.update((store) => store.ui.message = null);
  ctx.timers.message = setTimeout(hide, message2.bad ? SHOWN_MS.bad : SHOWN_MS.ok);
}
async function attempt(ctx, task) {
  try {
    await task();
    return true;
  } catch (error) {
    flash(ctx, { error, bad: true });
    return false;
  }
}
async function save(ctx, task) {
  const done = await attempt(ctx, task);
  if (done) flash(ctx, { key: "saved", bad: false });
  return done;
}

// src/state/actions/navigation.js
var LAYOUT_KEY = "weekheat-layout";
function closeEditors(ui) {
  ui.period = null;
  ui.addPlan = null;
  ui.renaming = null;
  ui.confirming = null;
}
function showView(ctx, view) {
  ctx.store.update(({ ui }) => {
    ui.view = ui.view === view ? "rooms" : view;
    ui.dayEdit = null;
    ui.confirming = null;
  });
}
function toggleRoom(ctx, room) {
  ctx.store.update(({ ui }) => {
    ui.openRoom = ui.openRoom === room ? null : room;
    closeEditors(ui);
  });
}
function showTab(ctx, room, tab) {
  ctx.store.update(({ ui }) => {
    ui.tab[room] = tab;
    closeEditors(ui);
  });
}
function selectPlan(ctx, room, plan2) {
  ctx.store.update(({ ui }) => {
    ui.plan[room] = plan2;
    closeEditors(ui);
  });
}
function selectThermostat(ctx, room, th) {
  ctx.store.update(({ ui }) => ui.thermostat[room] = th);
}
function toggleSettingsPart(ctx, part) {
  ctx.store.update(({ ui }) => {
    ui.settingsPart = ui.settingsPart === part ? null : part;
    ui.addRoom = ui.settingsPart === "add" ? { name: "", thermostats: [] } : null;
    ui.picker = null;
    ui.confirming = null;
  });
}
function toggleSetupPart(ctx, part) {
  ctx.store.update(({ ui }) => {
    ui.setupPart = ui.setupPart === part ? null : part;
    ui.picker = null;
  });
}
function goToSetup(ctx, room) {
  ctx.store.update(({ ui }) => {
    Object.assign(ui, { view: "rooms", openRoom: room, setupPart: null, picker: null });
    ui.tab[room] = "setup";
  });
}
function rememberedLayout() {
  try {
    const layout = localStorage.getItem(LAYOUT_KEY);
    return layout === "dial" || layout === "compact" ? layout : null;
  } catch {
    return null;
  }
}
function toggleLayout(ctx) {
  ctx.store.update(({ ui }) => ui.layout = ui.layout === "dial" ? "compact" : "dial");
  try {
    localStorage.setItem(LAYOUT_KEY, ctx.store.ui.layout);
  } catch {
  }
}
function dismiss(ctx, id) {
  return attempt(ctx, () => dismissNotification(ctx.gateway, id));
}

// src/state/context.js
function makeContext({ store, gateway, config }) {
  return { store, gateway, config, timers: {} };
}

// src/domain/versions.js
function blueprintVersion(description) {
  const marks = [...String(description || "").matchAll(/\bWeekheat (\d+\.\d+\.\d+)\b/g)];
  return marks.length ? marks[marks.length - 1][1] : null;
}
function olderVersion(a3, b3) {
  if (!a3) return true;
  const partsA = a3.split(".").map(Number);
  const partsB = b3.split(".").map(Number);
  const i6 = partsA.findIndex((part, index) => part !== partsB[index]);
  return i6 >= 0 && i6 < 3 && partsA[i6] < partsB[i6];
}

// src/version.js
var VERSION = "0.14.0";
var BLUEPRINT_VERSION = "0.14.0";

// src/ha/blueprints.js
function installedBlueprint(list, file) {
  const path = Object.keys(list).find((key) => key.endsWith(file));
  return { path, installed: path ? blueprintVersion(list[path]?.metadata?.description) : null };
}
function outdated(domain, list, file) {
  const { path, installed } = installedBlueprint(list, file);
  if (!path) return [];
  return olderVersion(installed, BLUEPRINT_VERSION) ? [{ domain, path, file, installed }] : [];
}
function exerciseNeeds(list, states) {
  const { path, installed } = installedBlueprint(list, EXERCISE_BLUEPRINT);
  const current = Boolean(path) && !olderVersion(installed, BLUEPRINT_VERSION);
  if (current && states[EXERCISE_SCRIPT]) return [];
  const where = path || `${BLUEPRINT_FOLDER}/${EXERCISE_BLUEPRINT}`;
  const need = { domain: (
    /** @type {const} */
    "script"
  ), path: where, installed, current };
  return [{ ...need, file: EXERCISE_BLUEPRINT, script: EXERCISE_SCRIPT }];
}
async function blueprintStatus(gateway) {
  const [automations, scripts] = await Promise.all([
    gateway.ws({ type: "blueprint/list", domain: "automation" }),
    gateway.ws({ type: "blueprint/list", domain: "script" })
  ]);
  const old = [
    ...outdated("automation", automations, ROOM_BLUEPRINT),
    ...outdated("script", scripts, DAY_BLUEPRINT),
    ...exerciseNeeds(scripts, gateway.states)
  ];
  return { automations, old };
}
async function replaceBlueprint(gateway, blueprint) {
  const file = `blueprints/${blueprint.domain}/${blueprint.file}`;
  const url = `${BLUEPRINT_REPO}v${BLUEPRINT_VERSION}/${file}`;
  const imported = await gateway.ws({ type: "blueprint/import", url });
  const path = blueprint.path.replace(/\.yaml$/, "");
  const save2 = { domain: blueprint.domain, path, yaml: imported.raw_data, allow_override: true };
  await gateway.ws({
    type: "blueprint/save",
    ...save2,
    source_url: `${BLUEPRINT_REPO}main/${file}`
  });
}
async function createScript(gateway, blueprint) {
  if (!blueprint.script || gateway.states[blueprint.script]) return;
  const id = blueprint.script.replace(/^script\./, "");
  const use = { path: blueprint.path, input: {} };
  await gateway.saveConfig(`script/config/${id}`, { alias: EXERCISE_ALIAS, use_blueprint: use });
}
async function updateBlueprints(gateway, old) {
  for (const blueprint of old) if (!blueprint.current) await replaceBlueprint(gateway, blueprint);
  await gateway.service("automation", "reload");
  await gateway.service("script", "reload");
  for (const blueprint of old) await createScript(gateway, blueprint);
}

// src/domain/exceptions.js
var WORKING_WORDS = ["werktag", "working day", "arbeitstag"];
var FREE_WORDS = ["freier tag", "free day", "wochenende", "weekend"];
var TITLES = {
  de: { working: "Werktag", free: "Freier Tag" },
  en: { working: "Working day", free: "Free day" }
};
function parseException(title) {
  const [, base2, rest] = String(title).trim().match(/^(.*?)(?:\s+[–-]\s+(.*))?$/);
  const name = base2.trim();
  const note = (rest || "").trim() || null;
  const low = name.toLowerCase();
  if (WORKING_WORDS.includes(low)) return { free: false, plan: null, note };
  if (FREE_WORDS.includes(low)) return { free: true, plan: null, note };
  if (low.startsWith("plan:")) return { free: false, plan: name.slice(5).trim(), note };
  return null;
}
function exceptionTitle(exception, lang2) {
  const titles = TITLES[lang2] || TITLES.en;
  const kind = exception.free ? titles.free : titles.working;
  const base2 = exception.plan ? `Plan: ${exception.plan}` : kind;
  return exception.note ? `${base2} \u2013 ${exception.note}` : base2;
}

// src/domain/time.js
var zoneFormats = /* @__PURE__ */ new Map();
function toMin(text) {
  const [hours, minutes] = String(text).split(":");
  return Number(hours) * 60 + Number(minutes);
}
function fromMin(minutes) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}
function zoneFormat(timeZone) {
  if (!zoneFormats.has(timeZone)) {
    const parts = { year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" };
    const options2 = { ...parts, hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone };
    zoneFormats.set(timeZone, new Intl.DateTimeFormat("en-GB", options2));
  }
  return zoneFormats.get(timeZone);
}
function nowIn(timeZone, at2 = /* @__PURE__ */ new Date()) {
  const parts = zoneFormat(timeZone).formatToParts(at2);
  const get = (type) => parts.find((part) => part.type === type).value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    day: get("weekday").slice(0, 3).toLowerCase(),
    min: Number(get("hour")) * 60 + Number(get("minute"))
  };
}
function addDays(iso, days) {
  const date = /* @__PURE__ */ new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// src/ha/days.js
async function loadDays(gateway, { script, days }) {
  const response = await gateway.runScript(script, { days });
  return response?.days || [];
}
function isOn(event, date) {
  if (!event.start.date) return String(event.start.dateTime || "").slice(0, 10) === date;
  return event.start.date <= date && date < event.end.date;
}
function createAllDay(gateway, calendar, { summary, from, until }) {
  const data = { entity_id: calendar, summary, start_date: from, end_date: until };
  return gateway.service("calendar", "create_event", data);
}
async function keepOtherDays(gateway, calendar, { event, date }) {
  const next = addDays(date, 1);
  const { summary, start, end } = event;
  if (start.date < date)
    await createAllDay(gateway, calendar, { summary, from: start.date, until: date });
  if (end.date > next)
    await createAllDay(gateway, calendar, { summary, from: next, until: end.date });
}
async function removeDay(gateway, calendar, { event, date }) {
  const recurrence = event.recurrence_id ? { recurrence_id: event.recurrence_id } : {};
  const remove = { type: "calendar/event/delete", entity_id: calendar, uid: event.uid };
  await gateway.ws({ ...remove, ...recurrence });
  if (!event.recurrence_id && event.start.date)
    await keepOtherDays(gateway, calendar, { event, date });
}
async function setException(gateway, { calendar, date, exception, lang: lang2 }) {
  if (!calendar) throw new CardError("no_exceptions");
  const range = `start=${date}T00:00:00&end=${addDays(date, 1)}T00:00:00`;
  const events = (
    /** @type {CalendarEvent[]} */
    await gateway.get(`calendars/${calendar}?${range}`)
  );
  const exceptions = events.filter((event) => parseException(event.summary) && isOn(event, date));
  for (const event of exceptions) await removeDay(gateway, calendar, { event, date });
  if (!exception) return;
  const summary = exceptionTitle(exception, lang2);
  await createAllDay(gateway, calendar, { summary, from: date, until: addDays(date, 1) });
}

// src/domain/periods.js
var STARTER = {
  weekday: [
    { start: 0, temperature: OFF_T, off: true },
    { start: 360, temperature: 21, off: false },
    { start: 420, temperature: 17, off: false },
    { start: 1020, temperature: 21, off: false },
    { start: 1260, temperature: 18, off: false },
    { start: 1320, temperature: OFF_T, off: true }
  ],
  free: [
    { start: 0, temperature: OFF_T, off: true },
    { start: 450, temperature: 21, off: false },
    { start: 510, temperature: 19, off: false },
    { start: 1020, temperature: 21, off: false },
    { start: 1290, temperature: 18, off: false },
    { start: 1350, temperature: OFF_T, off: true }
  ]
};
function gap(start) {
  return { start, temperature: null, off: false };
}
function blockPeriod(block) {
  const temperature = block.data?.temperature;
  return {
    start: toMin(block.from),
    temperature: typeof temperature === "number" ? temperature : null,
    off: Boolean(block.data?.off)
  };
}
function blocksToPeriods(blocks) {
  const sorted = [...blocks || []].sort((a3, b3) => toMin(a3.from) - toMin(b3.from));
  const periods = [];
  let end = 0;
  for (const block of sorted) {
    if (toMin(block.from) > end) periods.push(gap(end));
    periods.push(blockPeriod(block));
    end = toMin(block.to);
  }
  if (end < DAY_MINUTES) periods.push(gap(end));
  return periods;
}
function periodsToBlocks(periods) {
  const sorted = [...periods].sort((a3, b3) => a3.start - b3.start);
  return sorted.flatMap((period, i6) => {
    const end = i6 + 1 < sorted.length ? sorted[i6 + 1].start : DAY_MINUTES;
    if (period.temperature == null && !period.off || end <= period.start) return [];
    const data = period.off ? { temperature: OFF_T, off: true } : { temperature: period.temperature };
    return [{ from: `${fromMin(period.start)}:00`, to: `${fromMin(end)}:00`, data }];
  });
}
function checkPeriods(periods) {
  const errors = /* @__PURE__ */ new Set();
  if (!periods.length || periods[0].start !== 0) errors.add("first");
  if (periods.some((period, i6) => i6 > 0 && period.start <= periods[i6 - 1].start))
    errors.add("order");
  const badTemp = (period) => typeof period.temperature !== "number" || period.temperature < MIN_T || period.temperature > MAX_T;
  if (periods.some((period) => !period.off && badTemp(period))) errors.add("temp");
  return [...errors];
}
function periodTemp(period) {
  return period.off ? OFF_T : period.temperature;
}
function periodAt(periods, minute) {
  const index = periods.reduce((found2, period2, i6) => period2.start <= minute ? i6 : found2, 0);
  const period = periods[index];
  const later = periods.slice(index + 1);
  const next = later.find((other) => periodTemp(other) !== periodTemp(period)) || null;
  return { index, period, next };
}

// src/domain/plans.js
var TRANSLITERATION = {
  \u00DF: "ss",
  "\u1E9E": "ss",
  \u00E6: "ae",
  \u00C6: "ae",
  \u0153: "oe",
  \u0152: "oe",
  \u00F8: "o",
  \u00D8: "o",
  \u0142: "l",
  \u0141: "l",
  \u0111: "d",
  \u0110: "d",
  \u00F0: "d",
  \u00D0: "d",
  \u00FE: "th",
  \u00DE: "th",
  \u0127: "h",
  \u0126: "h",
  \u0167: "t",
  \u0166: "t",
  \u014B: "ng",
  \u014A: "ng",
  \u0131: "i",
  \u0138: "k"
};
var TRANSLITERATED = new RegExp(`[${Object.keys(TRANSLITERATION).join("")}]`, "g");
var ACCENTS = /[\u0300-\u036f]/g;
function slugify(text) {
  return String(text).replace(TRANSLITERATED, (letter) => TRANSLITERATION[letter]).normalize("NFKD").replace(ACCENTS, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
function planLabel(friendly, room) {
  const name = String(friendly || "");
  const prefixed = room && name.toLowerCase().startsWith(`${room.toLowerCase()} `);
  return prefixed ? name.slice(room.length + 1) : name;
}
function exactPlans(want, plans, { friendly = {}, room = "" }) {
  const own = `schedule.weekheat_${slugify(room)}_${want}`;
  const named = plans.filter((plan2) => slugify(planLabel(friendly[plan2], room)) === want);
  return [...named, ...plans.filter((plan2) => plan2 === own)];
}
function matchPlan(name, plans, names = {}) {
  const want = slugify(name || "");
  if (!want) return null;
  const exact = exactPlans(want, plans, names);
  if (exact.length) return exact[0];
  const tail = ` ${String(name).toLowerCase()}`;
  const friendly = (plan2) => String(names.friendly?.[plan2] || "").toLowerCase();
  const ends = plans.filter((plan2) => plan2.endsWith(`_${want}`) || friendly(plan2).endsWith(tail));
  return ends.length === 1 ? ends[0] : null;
}
function planForDay(room, day, friendly = {}) {
  const named = day.plan ? matchPlan(day.plan, room.plans, { friendly, room: room.name }) : null;
  if (named) return named;
  if (day.free) return room.free_day;
  return (room.week || {})[day.weekday] || room.plans[0];
}
function dayOf(days, now2) {
  const found2 = (days || []).find((day) => day.date === now2.date);
  return found2 || { date: now2.date, weekday: now2.day, free: false, kind: "plain" };
}

// src/ha/wait.js
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function waitFor(condition, { timeoutMs = 5e3, everyMs = 250 } = {}) {
  const until = Date.now() + timeoutMs;
  for (; ; ) {
    const value = await condition();
    if (value) return value;
    if (Date.now() >= until) return void 0;
    await sleep(everyMs);
  }
}
async function waitForReload(gateway, entity, { timeoutMs = 5e3 } = {}) {
  const before = gateway.states[entity]?.last_updated;
  const changed = () => gateway.states[entity]?.last_updated !== before;
  return Boolean(await waitFor(changed, { timeoutMs }));
}

// src/ha/plans.js
function planOf(item) {
  const periodsOf = (day, i6) => [day, blocksToPeriods(item[SCHEDULE_DAYS[i6]])];
  const days = Object.fromEntries(WEEK.map(periodsOf));
  const monday = JSON.stringify(days.mon);
  const perDay = WEEK.some((day) => JSON.stringify(days[day]) !== monday);
  return { item, periods: days.mon, days, perDay };
}
function everyDay(periods) {
  const blocks = periodsToBlocks(periods);
  return Object.fromEntries(SCHEDULE_DAYS.map((day) => [day, blocks]));
}
async function loadPlans(gateway) {
  const [items, registry] = await Promise.all([
    gateway.ws({ type: "schedule/list" }),
    gateway.ws({ type: "config/entity_registry/list" })
  ]);
  const schedules = registry.filter((entry) => entry.platform === "schedule");
  const entityOf = Object.fromEntries(schedules.map((entry) => [entry.unique_id, entry.entity_id]));
  const pairs = items.filter((item) => entityOf[item.id]).map((item) => [entityOf[item.id], planOf(item)]);
  return Object.fromEntries(pairs);
}
async function savePlan(gateway, item, { name, periods }) {
  const icon = item.icon ? { icon: item.icon } : {};
  const update = { type: "schedule/update", schedule_id: item.id, name, ...icon };
  return planOf(await gateway.ws({ ...update, ...everyDay(periods) }));
}
async function scheduleEntity(gateway, itemId) {
  const find = async () => {
    const registry = await gateway.ws({ type: "config/entity_registry/list" });
    return registry.find((entry2) => entry2.platform === "schedule" && entry2.unique_id === itemId);
  };
  const entry = await waitFor(find);
  if (!entry) throw new Error(`schedule ${itemId}: no entity`);
  return entry.entity_id;
}
async function createPlan(gateway, { room, name, periods }) {
  const create = { type: "schedule/create", name: `${room} ${name}`, icon: "mdi:calendar-clock" };
  const item = await gateway.ws({ ...create, ...everyDay(periods) });
  const made = { plan: planOf(item), remove: () => deletePlan(gateway, item) };
  const entity = await scheduleEntity(gateway, item.id);
  const wanted = `schedule.weekheat_${slugify(room)}_${slugify(name)}`;
  if (entity === wanted || gateway.states[wanted]) return { entity, ...made };
  await gateway.ws({
    type: "config/entity_registry/update",
    entity_id: entity,
    new_entity_id: wanted
  });
  return { entity: wanted, ...made };
}
async function deletePlan(gateway, item) {
  await gateway.ws({ type: "schedule/delete", schedule_id: item.id });
}

// src/ha/rooms.js
function roomBlueprintPaths(blueprints) {
  return Object.keys(blueprints).filter((path) => path.endsWith(ROOM_BLUEPRINT));
}
async function roomAutomations(gateway, paths) {
  const search = (path) => ({
    type: "search/related",
    item_type: "automation_blueprint",
    item_id: path
  });
  const found2 = await Promise.all(paths.map((path) => gateway.ws(search(path))));
  return [...new Set(found2.flatMap((related) => related.automation || []))];
}
async function readRooms(gateway, paths) {
  const related = new Set(await roomAutomations(gateway, paths));
  const entities = Object.keys(gateway.states).filter((entity) => related.has(entity));
  const found2 = entities.map((entity) => ({ entity, id: gateway.states[entity]?.attributes.id })).filter((room) => room.id);
  const configs = await Promise.all(
    found2.map((room) => gateway.readConfig(`automation/config/${room.id}`))
  );
  return found2.flatMap((room, i6) => roomOf(room, configs[i6]));
}
function roomOf(automation, cfg) {
  if (!String(cfg?.use_blueprint?.path || "").endsWith(ROOM_BLUEPRINT)) return [];
  return [{ ...automation, cfg, ...roomFromInput(cfg.use_blueprint.input || {}, cfg.alias) }];
}
async function saveRoom(gateway, room, input) {
  if (input.thermostats) checkStateSize(
    /** @type {string[]} */
    input.thermostats
  );
  const use = room.cfg.use_blueprint;
  const cfg = { ...room.cfg, use_blueprint: { ...use, input: { ...use.input, ...input } } };
  await gateway.saveConfig(`automation/config/${room.id}`, cfg);
  return { ...room, cfg, ...roomFromInput(cfg.use_blueprint.input, cfg.alias) };
}

// src/state/loader.js
function orderRooms(rooms2, order) {
  if (!Array.isArray(order) || !order.length)
    return [...rooms2].sort((a3, b3) => a3.name.localeCompare(b3.name));
  const named = (key) => rooms2.find((room) => room.entity === key || room.id === key);
  return order.map(named).filter(Boolean);
}
function scriptId(config) {
  return config.day_script.replace(/^script\./, "");
}
async function publishHome(ctx) {
  const { allRooms, script, exceptions } = ctx.store.data;
  const directory = makeDirectory({ rooms: allRooms, script: Boolean(script), exceptions });
  try {
    await publishDirectory(ctx.gateway, directory);
  } catch (error) {
    console.warn("Weekheat: the room directory cannot be published", error);
  }
}
async function homeForAdmin(ctx) {
  const { automations, old } = await blueprintStatus(ctx.gateway);
  const paths = roomBlueprintPaths(automations);
  const allRooms = await readRooms(ctx.gateway, paths);
  const script = await ctx.gateway.readConfig(`script/config/${scriptId(ctx.config)}`);
  const exceptions = script?.use_blueprint?.input?.exceptions || null;
  const home = { admin: true, allRooms, script, hasScript: Boolean(script), exceptions };
  return { ...home, roomBlueprint: paths[0] || null, oldBlueprints: old, noDirectory: false };
}
async function homeForUser(ctx) {
  const directory = await readDirectory(ctx.gateway);
  const none = { admin: false, script: null, roomBlueprint: null, oldBlueprints: [] };
  if (!directory)
    return { ...none, allRooms: [], hasScript: false, exceptions: null, noDirectory: true };
  const allRooms = (
    /** @type {any[]} */
    directory.rooms.map((room) => ({ ...room }))
  );
  return {
    ...none,
    allRooms,
    hasScript: Boolean(directory.script),
    exceptions: directory.exceptions,
    noDirectory: false
  };
}
function loadDayList(ctx) {
  if (!ctx.store.data.hasScript) return Promise.resolve(null);
  return loadDays(ctx.gateway, { script: ctx.config.day_script, days: ctx.config.days });
}
async function load(ctx) {
  const generation = ++ctx.store.loads;
  try {
    const home = ctx.gateway.isAdmin ? await homeForAdmin(ctx) : await homeForUser(ctx);
    const plans = await loadPlans(ctx.gateway);
    const rooms2 = orderRooms(home.allRooms, ctx.config.rooms);
    if (generation !== ctx.store.loads) return;
    ctx.store.update((store) => Object.assign(store.data, home, { plans, rooms: rooms2, error: null }));
    const days = await loadDayList(ctx);
    if (generation === ctx.store.loads) ctx.store.update((store) => store.data.days = days);
    if (home.admin) await publishHome(ctx);
  } catch (error) {
    if (generation === ctx.store.loads) ctx.store.update((store) => store.data.error = error);
  }
}

// src/domain/room-status.js
function sameSetpoint(a3, b3) {
  return Math.abs(a3 - b3) < SAME_SETPOINT;
}
function isNumber(value) {
  return typeof value === "number";
}
function storedState(states, entity) {
  try {
    return JSON.parse(states[entity]?.state || "{}") || {};
  } catch {
    return {};
  }
}
function periodsOn(plan2, weekday) {
  return plan2?.days?.[weekday] || plan2?.periods || [];
}
function planNow(room, input) {
  const plan2 = planForDay(room, input.today, input.friendly);
  const periods = periodsOn(input.plans[plan2], input.today.weekday);
  const at2 = periods.length ? periodAt(periods, input.minute) : null;
  const wanted = at2 && at2.period.temperature != null ? periodTemp(at2.period) : null;
  return { plan: plan2, periods, at: at2, wanted };
}
function isSwitchedOff(room, states) {
  return Boolean(room.heating_switch) && states[room.heating_switch]?.state === "off";
}
function holds(room, states, stored) {
  const active = states[room.entity]?.state === "on";
  const heatingOff = isSwitchedOff(room, states);
  const held = active && !heatingOff && Boolean(stored._open);
  return {
    active,
    heatingOff,
    exercise: active && Boolean(stored._ex),
    roomClosed: held && Boolean(stored._rc),
    windowOpen: held && !stored._rc,
    saved: stored._open || null,
    openWindows: (room.windows || []).filter((entity) => states[entity]?.state === "on")
  };
}
function isHeating(state, target) {
  const current = state.attributes.current_temperature;
  const warm = isNumber(current) && isNumber(target) && current >= target - HEATING_MARGIN;
  return state.attributes.hvac_action === "heating" && !warm;
}
function roomTemperature(room, states, available) {
  const sensor = room.room_sensor ? states[room.room_sensor]?.state : void 0;
  if (sensor && !Number.isNaN(Number(sensor))) return Number(sensor);
  const values = available.map((state) => state.attributes.current_temperature).filter(isNumber);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}
function roomTarget(available, hold) {
  const kept = hold.roomClosed ? hold.saved.filter(isNumber) : [];
  if (kept.length) return Math.max(...kept);
  return available.map((state) => state.attributes.temperature).find(isNumber) ?? null;
}
function isManualRoom(hold, { wanted, target }, available) {
  if (hold.exercise || hold.heatingOff || hold.windowOpen || wanted == null) return false;
  if (hold.roomClosed) return target != null && !sameSetpoint(target, wanted);
  const differs = (temp) => !isNumber(temp) || !sameSetpoint(temp, wanted);
  return available.some((state) => state.state === "off" || differs(state.attributes.temperature));
}
function roomReadings(room, { states, available, hold }) {
  const heats = (state) => isHeating(state, state.attributes.temperature);
  return {
    target: roomTarget(available, hold),
    current: roomTemperature(room, states, available),
    heating: !hold.roomClosed && available.some(heats),
    step: available[0]?.attributes.target_temp_step || DEFAULT_STEP
  };
}
function roomStatus(room, input) {
  const { states } = input;
  const hold = holds(room, states, storedState(states, room.state));
  const known = room.thermostats.map((entity) => states[entity]).filter(Boolean);
  const available = known.filter((state) => !UNAVAILABLE.includes(state.state));
  const now2 = planNow(room, input);
  const readings = roomReadings(room, { states, available, hold });
  const manual = isManualRoom(hold, { wanted: now2.wanted, target: readings.target }, available);
  return { ...hold, ...now2, ...readings, manual, unavailable: known.length - available.length };
}
function roomMode(status) {
  const order = [
    ["paused", !status.active],
    ["exercise", status.exercise],
    ["heating-off", status.heatingOff],
    ["window", status.windowOpen],
    ["valve-closed", status.roomClosed],
    ["manual", status.manual],
    ["heating", status.heating]
  ];
  return order.find(([, applies]) => applies)?.[0] || "scheduled";
}
function canReturnToPlan(status) {
  return status.manual && status.active;
}

// src/domain/thermostat-status.js
function thermostatLabel(room, entity, states) {
  const friendly = states[entity]?.attributes.friendly_name || entity;
  return planLabel(friendly, room.name) || friendly;
}
function thermostatTarget(status, index, state) {
  const saved = status.roomClosed ? status.saved?.[index] : void 0;
  if (typeof saved === "number") return saved;
  return state ? state.attributes.temperature : null;
}
function isManualThermostat(status, state, target) {
  if (status.exercise || status.heatingOff || status.windowOpen || status.wanted == null)
    return false;
  return state.state === "off" || typeof target !== "number" || !sameSetpoint(target, status.wanted);
}
function thermostatStatus(room, entity, { status, states }) {
  const found2 = states[entity];
  const state = found2 && !UNAVAILABLE.includes(found2.state) ? found2 : null;
  const target = thermostatTarget(status, room.thermostats.indexOf(entity), state);
  const label = thermostatLabel(room, entity, states);
  return { ...status, ...thermostatFlags(status, state, target), target, th: entity, label };
}
function thermostatFlags(status, state, target) {
  const current = state?.attributes.current_temperature;
  return {
    current: typeof current === "number" ? current : status.current,
    manual: Boolean(state) && isManualThermostat(status, state, target),
    heating: Boolean(state) && !status.roomClosed && isHeating(state, target),
    step: state?.attributes.target_temp_step || status.step
  };
}
function mixedTargets(room, context) {
  if (room.thermostats.length < 2) return null;
  const targets2 = room.thermostats.map((entity) => thermostatStatus(room, entity, context).target);
  const values = targets2.filter((value) => typeof value === "number");
  const differ = values.some((value) => Math.abs(value - values[0]) >= SAME_SHOWN);
  return values.length > 1 && differ ? values : null;
}

// src/domain/dial.js
var DIAL = { cx: 100, cy: 100, radius: 80, start: 135, sweep: 270 };
function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}
function snap(value, { low, high, step }) {
  return clamp(Math.round(value / step) * step, low, high);
}
function dialAngle(value, low, high) {
  return DIAL.start + clamp((value - low) / (high - low), 0, 1) * DIAL.sweep;
}
function dialPoint(angle, radius = DIAL.radius) {
  const rad = angle * Math.PI / 180;
  return [DIAL.cx + radius * Math.cos(rad), DIAL.cy + radius * Math.sin(rad)];
}
function dialArc(from, to, radius = DIAL.radius) {
  const [x1, y1] = dialPoint(from, radius).map((value) => value.toFixed(2));
  const [x2, y22] = dialPoint(to, radius).map((value) => value.toFixed(2));
  const large = to - from > 180 ? 1 : 0;
  return `M${x1} ${y1}A${radius} ${radius} 0 ${large} 1 ${x2} ${y22}`;
}
function dialValue(x2, y3, scale2) {
  const degrees = Math.atan2(y3 - DIAL.cy, x2 - DIAL.cx) * 180 / Math.PI;
  let along = ((degrees - DIAL.start) % 360 + 360) % 360;
  if (along > DIAL.sweep) along = along > DIAL.sweep + (360 - DIAL.sweep) / 2 ? 0 : DIAL.sweep;
  return snap(scale2.low + along / DIAL.sweep * (scale2.high - scale2.low), scale2);
}
function sliderValue(fraction, scale2) {
  return snap(scale2.low + clamp(fraction, 0, 1) * (scale2.high - scale2.low), scale2);
}
function sliderPercent(value, { low, high }) {
  return clamp((value - low) / (high - low) * 100, 0, 100).toFixed(2);
}

// src/domain/formatting.js
var NUMBER_LOCALES = {
  comma_decimal: ["en-US", "en"],
  decimal_comma: ["de", "es", "it"],
  space_comma: ["fr", "sv", "cs"],
  quote_decimal: ["de-CH"],
  none: ["en-US"]
};
var clocks = /* @__PURE__ */ new Map();
function localeHour12(locale) {
  const key = locale || "";
  if (!clocks.has(key)) {
    const cycle = new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hourCycle;
    clocks.set(key, cycle === "h11" || cycle === "h12");
  }
  return clocks.get(key);
}
function isHour12(timeFormat, language) {
  if (timeFormat === "12") return true;
  if (timeFormat === "24") return false;
  return localeHour12(timeFormat === "system" ? void 0 : language);
}
function formattingOf(locale, fallback) {
  const language = locale?.language || fallback;
  const format = locale?.number_format;
  const numbers = format === "system" ? void 0 : NUMBER_LOCALES[format] || [language];
  const hour12 = isHour12(locale?.time_format, language);
  return { numbers, grouping: format !== "none", hour12, language };
}

// src/i18n/de.js
var de_default = {
  working_day: "Werktag",
  free_day: "Freier Tag",
  today: "Heute",
  tomorrow: "Morgen",
  weekdays: {
    mon: "Montag",
    tue: "Dienstag",
    wed: "Mittwoch",
    thu: "Donnerstag",
    fri: "Freitag",
    sat: "Samstag",
    sun: "Sonntag"
  },
  wd_short: {
    mon: "Mo",
    tue: "Di",
    wed: "Mi",
    thu: "Do",
    fri: "Fr",
    sat: "Sa",
    sun: "So"
  },
  holiday: "Feiertag",
  exception: "Ausnahme",
  calendar: "Kalender",
  off: "Aus",
  until: "bis",
  then: "dann",
  tomorrow_l: "morgen",
  manual: "Manuell",
  plan: "Plan",
  plans: "Pl\xE4ne",
  days: "Tage",
  settings: "Einstellungen",
  room: "Raum",
  save: "Speichern",
  cancel: "Abbrechen",
  delete: "L\xF6schen",
  add_period: "Periode hinzuf\xFCgen",
  add_plan: "Plan hinzuf\xFCgen",
  copy_from: "Vorlage",
  starter_weekday: "Vorlage Werktag",
  starter_free: "Vorlage Freier Tag",
  name: "Name",
  from: "ab",
  temperature: "Temperatur",
  as_decided: "Wie berechnet",
  note: "Notiz",
  only_if_working: "nur wenn zum Werktag gemacht",
  paused: "Pausiert",
  active: "Aktiv",
  add_room: "Raum hinzuf\xFCgen",
  thermostats: "Thermostate",
  create: "Anlegen",
  keyword_calendars: "Kalender f\xFCr Stichw\xF6rter",
  rules: "Stichwort-Regeln",
  keyword: "Stichwort",
  rule_free: "freier Tag",
  workday_sensor: "Workday-Sensor",
  exceptions_calendar: "Kalender f\xFCr Ausnahmen",
  holiday_calendar: "Feiertagskalender",
  add_rule: "Regel hinzuf\xFCgen",
  none: "\u2014",
  err_first: "Die erste Periode muss um 00:00 beginnen.",
  err_order: "Die Zeiten m\xFCssen aufsteigen.",
  err_temp: "Temperaturen zwischen {min} und {max} \xB0C.",
  no_directory: "Die R\xE4ume erscheinen hier, sobald ein Administrator die Weekheat-Karte einmal ge\xF6ffnet hat.",
  no_rooms: "Noch keine R\xE4ume. Ein Raum ist eine Automation aus dem Blueprint \u201EWeekheat room\u201C.",
  no_script: "Das Skript \u201EWeekheat day\u201C fehlt.",
  unavailable: "nicht erreichbar",
  err_plan_in_use: "Dieser Plan wird in der Woche verwendet und kann nicht gel\xF6scht werden.",
  saved: "Gespeichert",
  error: "Fehler",
  new_room_paused: "Neue R\xE4ume starten pausiert: Pl\xE4ne pr\xFCfen, dann aktivieren.",
  dismiss: "Ausblenden",
  reason_weekend: "Wochenende",
  heating: "Heizt",
  scheduled: "Nach Plan",
  current: "Raum",
  layout_dial: "Drehregler",
  layout_compact: "Schieberegler",
  setpoint: "Solltemperatur",
  all_rooms: "Alle R\xE4ume",
  v_control: "Regler",
  v_plan: "Plan",
  v_week: "Woche",
  heating_l_cap: "Heizung",
  to: "auf",
  rename: "Umbenennen",
  unsaved: "Nicht gespeichert",
  used_on: "Verwendet",
  not_used: "Derzeit in keiner Woche verwendet",
  free_days: "Freie Tage",
  week_help: "Freie Tage sind Wochenenden, Feiertage und Tage aus Kalender oder Ausnahmen.",
  rooms: "R\xE4ume",
  thermostats_short: ["Thermostat", "Thermostate"],
  windows_short: ["Kontakt", "Kontakte"],
  day_settings: "Werktage und freie Tage",
  pause_room: "Raum pausieren",
  activate_room: "Raum aktivieren",
  pause_help: "Pausiert: Weekheat schreibt nichts, die Thermostate behalten ihren Wert. Zum Abschalten den Heizungsschalter des Raums verwenden.",
  heating_off: "Aus",
  heating_l: "Heizung",
  turn_on: "Heizung einschalten",
  turn_off: "Heizung ausschalten",
  window_open: "Fenster offen",
  windows: "Fenster- und T\xFCrkontakte",
  window_delay: "Verz\xF6gerung (Sekunden)",
  exercise: "Ventilpflege",
  exercise_sub: "Einmal pro Woche ganz \xF6ffnen und schlie\xDFen",
  exercise_day: "Tag",
  exercise_time: "Uhrzeit",
  exercise_wait: "Wartezeit (Sekunden)",
  exercise_now: "Jetzt ausf\xFChren",
  exercise_started: "Ventilpflege l\xE4uft",
  exercise_help: "Alle Thermostate auf 30 \xB0C, warten, auf 5 \xB0C, warten, das Ganze zweimal; danach wieder der Wert von vorher (oder der Plan, falls inzwischen eine neue Periode begann). Dauert etwa viermal die Wartezeit. Pausierte R\xE4ume werden ausgelassen.",
  window_help: "Ist einer davon so lange offen, werden die Thermostate auf 5 \xB0C gestellt; sind alle wieder zu, gilt wieder der Wert von vorher (oder der Plan, falls inzwischen eine neue Periode begann).",
  room_sensor: "Raumsensor",
  room_margin: "Spielraum",
  rc_closed: "Warm genug \xB7 Ventil zu",
  v_setup: "Einrichtung",
  all_th: "Alle",
  both_th: "Beide",
  both_help: "verschiebt alle um gleich viel",
  to_plan: "Zur\xFCck zum Plan",
  manual_until: "Manuelle Werte gelten bis",
  manual_then: ", dann wieder der Plan.",
  colder: "K\xE4lter",
  warmer: "W\xE4rmer",
  pick_th: "Thermostat w\xE4hlen",
  search: "Suchen",
  add: "Hinzuf\xFCgen",
  remove: "Entfernen",
  in_area: "Im Bereich",
  other_areas: "Andere Bereiche",
  no_match: "Nichts gefunden",
  more_matches: "weitere \u2013 Suche verfeinern",
  windows_doors: "Fenster und T\xFCren",
  delay: "Verz\xF6gerung (Sekunden)",
  margin_less: "Spielraum kleiner",
  margin_more: "Spielraum gr\xF6\xDFer",
  day_wd: "Workday und Feiertage",
  calendars_n: ["Kalender", "Kalender"],
  rules_n: ["Regel", "Regeln"],
  room_sensor_short: "Raumsensor",
  room_closed_help: "Ist der Raum um {margin} w\xE4rmer als die Solltemperatur, geht das Ventil zu (5 \xB0C). Ist er wieder auf die Solltemperatur abgek\xFChlt, heizt es wieder.",
  rs_workaround: "Nur n\xF6tig f\xFCr Thermostate, die einen verkn\xFCpften Sensor nicht beachten oder \xFCberschwingen, z. B. Aqara W600. Thermostate, die gut regeln, brauchen das nicht.",
  bp_old: "Die Weekheat-Blueprints sind \xE4lter als die Karte ({installed} \u2192 {needed}).",
  bp_none: "ohne Version",
  bp_no_exercise: "Das Skript f\xFCr die Ventilpflege fehlt.",
  bp_update: "Jetzt aktualisieren",
  err_room_name: "Der Name braucht mindestens einen Buchstaben oder eine Ziffer.",
  err_room_exists: "Ein Raum mit diesem Namen existiert schon (Automation {id}).",
  err_no_blueprint: "Der Blueprint \u201EWeekheat room\u201C ist nicht installiert.",
  err_state_size: "Zu viele Thermostate f\xFCr einen Raum: Ihr Zustand br\xE4uchte bis zu {size} Zeichen, ein Zustands-Helfer fasst {max}. Weniger Thermostate w\xE4hlen oder ihnen k\xFCrzere Entity-IDs geben.",
  room_help: "Ist der Raum um den Spielraum w\xE4rmer als die Solltemperatur, werden die Thermostate auf 5 \xB0C gestellt; ist er wieder auf die Solltemperatur abgek\xFChlt, bekommen sie sie zur\xFCck. F\xFCr Thermostate, die \xFCberschwingen oder einen verkn\xFCpften Sensor nicht beachten.",
  err_no_exceptions: "Kein Kalender f\xFCr Ausnahmen eingestellt.",
  err_no_switch: "Dieser Raum hat keinen Heizungsschalter; ein Administrator kann ihn anlegen.",
  // Two-step buttons (state/actions/confirm.js) and plans that differ by weekday.
  really_delete: "Wirklich l\xF6schen?",
  really_exercise: "Wirklich in allen aktiven R\xE4umen ausf\xFChren?",
  plan_per_day: "In Home Assistant ist dieser Plan je Wochentag anders. Hier steht der Montag; wird er hier gespeichert, gilt er f\xFCr jeden Tag."
};

// src/i18n/en.js
var en_default = {
  working_day: "Working day",
  free_day: "Free day",
  today: "Today",
  tomorrow: "Tomorrow",
  weekdays: {
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
    sun: "Sunday"
  },
  wd_short: {
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
    sun: "Sun"
  },
  holiday: "Public holiday",
  exception: "Exception",
  calendar: "Calendar",
  off: "Off",
  until: "until",
  then: "then",
  tomorrow_l: "tomorrow",
  manual: "Manual",
  plan: "Plan",
  plans: "Plans",
  days: "Days",
  settings: "Settings",
  room: "Room",
  save: "Save",
  cancel: "Cancel",
  delete: "Delete",
  add_period: "Add period",
  add_plan: "Add plan",
  copy_from: "Template",
  starter_weekday: "Starter working day",
  starter_free: "Starter free day",
  name: "Name",
  from: "from",
  temperature: "Temperature",
  as_decided: "As decided",
  note: "Note",
  only_if_working: "only if made a working day",
  paused: "Paused",
  active: "Active",
  add_room: "Add room",
  thermostats: "Thermostats",
  create: "Create",
  keyword_calendars: "Keyword calendars",
  rules: "Keyword rules",
  keyword: "Keyword",
  rule_free: "free day",
  workday_sensor: "Workday sensor",
  exceptions_calendar: "Exceptions calendar",
  holiday_calendar: "Holiday calendar",
  add_rule: "Add rule",
  none: "\u2014",
  err_first: "The first period must start at 00:00.",
  err_order: "Times must increase.",
  err_temp: "Temperatures between {min} and {max} \xB0C.",
  no_directory: "The rooms show here once an administrator has opened the Weekheat card.",
  no_rooms: 'No rooms yet. A room is an automation made from the "Weekheat room" blueprint.',
  no_script: 'The "Weekheat day" script is missing.',
  unavailable: "unavailable",
  err_plan_in_use: "This plan is used in the week and cannot be deleted.",
  saved: "Saved",
  error: "Error",
  new_room_paused: "New rooms start paused: check the plans, then activate.",
  dismiss: "Dismiss",
  reason_weekend: "Weekend",
  heating: "Heating",
  scheduled: "Scheduled",
  current: "Room",
  layout_dial: "Dial",
  layout_compact: "Slider",
  setpoint: "Setpoint",
  all_rooms: "All rooms",
  v_control: "Control",
  v_plan: "Plan",
  v_week: "Week",
  heating_l_cap: "Heating",
  to: "to",
  rename: "Rename",
  unsaved: "Not saved",
  used_on: "Used",
  not_used: "Not used in the week at the moment",
  free_days: "Free days",
  week_help: "Free days are weekends, public holidays and days from calendars or exceptions.",
  rooms: "Rooms",
  thermostats_short: ["thermostat", "thermostats"],
  windows_short: ["contact", "contacts"],
  day_settings: "Working days and free days",
  pause_room: "Pause room",
  activate_room: "Activate room",
  pause_help: "Paused: Weekheat writes nothing and the thermostats keep their value. To turn a room off, use its heating switch.",
  heating_off: "Off",
  heating_l: "heating",
  turn_on: "Turn heating on",
  turn_off: "Turn heating off",
  window_open: "Window open",
  windows: "Window and door sensors",
  window_delay: "Delay (seconds)",
  exercise: "Valve exercise",
  exercise_sub: "Open and close fully once a week",
  exercise_day: "Day",
  exercise_time: "Time",
  exercise_wait: "Wait (seconds)",
  exercise_now: "Run now",
  exercise_started: "Valve exercise running",
  exercise_help: "All thermostats to 30 \xB0C, wait, to 5 \xB0C, wait, twice; then the value from before again (or the plan, if a new period began in between). Takes about four times the wait. Paused rooms are left out.",
  window_help: "When one of them has been open this long, the thermostats are set to 5 \xB0C; when all are closed again, the value from before applies again (or the plan, if a new period began in between).",
  room_sensor: "Room sensor",
  room_margin: "Margin",
  rc_closed: "Warm enough \xB7 valve closed",
  v_setup: "Setup",
  all_th: "All",
  both_th: "All together",
  both_help: "moves all by the same amount",
  to_plan: "Back to plan",
  manual_until: "Manual values hold until",
  manual_then: ", then the plan again.",
  colder: "Colder",
  warmer: "Warmer",
  pick_th: "Pick a thermostat",
  search: "Search",
  add: "Add",
  remove: "Remove",
  in_area: "In the area",
  other_areas: "Other areas",
  no_match: "No match",
  more_matches: "more \u2013 refine the search",
  windows_doors: "Windows and doors",
  delay: "Delay (seconds)",
  margin_less: "Smaller margin",
  margin_more: "Larger margin",
  day_wd: "Workday and holidays",
  calendars_n: ["calendar", "calendars"],
  rules_n: ["rule", "rules"],
  room_sensor_short: "room sensor",
  room_closed_help: "When the room is {margin} above the setpoint, the valve closes (5 \xB0C). Once it has cooled down to the setpoint, it heats again.",
  rs_workaround: "Only needed for thermostats that ignore a linked sensor or overshoot, e.g. the Aqara W600. Thermostats that control well do not need it.",
  bp_old: "The Weekheat blueprints are older than the card ({installed} \u2192 {needed}).",
  bp_none: "no version",
  bp_no_exercise: "The script for the valve exercise is missing.",
  bp_update: "Update now",
  err_room_name: "The name needs at least one letter or digit.",
  err_room_exists: "A room with this name exists already (automation {id}).",
  err_no_blueprint: 'The "Weekheat room" blueprint is not installed.',
  err_state_size: "Too many thermostats for one room: their state would need up to {size} characters, and a state helper holds {max}. Pick fewer thermostats, or give them shorter entity ids.",
  room_help: "When the room is the margin above the setpoint, the thermostats are set to 5 \xB0C; once it has cooled down to the setpoint, they get it back. For thermostats that overshoot or ignore a linked sensor.",
  err_no_exceptions: "No exceptions calendar is set.",
  err_no_switch: "This room has no heating switch; an administrator can add one.",
  // Two-step buttons (state/actions/confirm.js) and plans that differ by weekday.
  really_delete: "Really delete?",
  really_exercise: "Really run in all active rooms?",
  plan_per_day: "In Home Assistant this plan differs by weekday. Shown here is Monday; saving it here makes every day like it."
};

// src/i18n/text.js
var TEXTS = { de: de_default, en: en_default };
function languageOf(hass) {
  const language = String(hass.locale?.language || hass.language || "en");
  return language.startsWith("de") ? "de" : "en";
}
function textsFor(lang2) {
  return TEXTS[lang2] || TEXTS.en;
}
function fill(text, values) {
  return text.replace(/\{(\w+)\}/g, (all, key) => key in values ? String(values[key]) : all);
}

// src/state/selectors.js
function lang(ctx) {
  return languageOf(ctx.gateway.hass);
}
function formatting(ctx) {
  const { hass } = ctx.gateway;
  return formattingOf(hass.locale, hass.language || "en");
}
function texts(ctx) {
  return textsFor(lang(ctx));
}
function now(ctx) {
  return nowIn(ctx.gateway.hass.config.time_zone);
}
function today(ctx) {
  return dayOf(ctx.store.data.days, now(ctx));
}
function friendlyNames(ctx) {
  const { plans } = ctx.store.data;
  const name = (entity) => ctx.gateway.states[entity]?.attributes.friendly_name || plans[entity].item.name;
  return Object.fromEntries(Object.keys(plans).map((entity) => [entity, name(entity)]));
}
function planName(ctx, room, entity) {
  const friendly = ctx.gateway.states[entity]?.attributes.friendly_name;
  return planLabel(friendly || ctx.store.data.plans[entity]?.item.name || entity, room.name);
}
function findRoom(ctx, id) {
  const { rooms: rooms2, allRooms } = ctx.store.data;
  return (rooms2 || []).find((room) => room.id === id) || allRooms.find((room) => room.id === id);
}
function statusOf(ctx, room) {
  const input = { states: ctx.gateway.states, plans: ctx.store.data.plans, today: today(ctx) };
  return roomStatus(room, { ...input, minute: now(ctx).min, friendly: friendlyNames(ctx) });
}
function controlStatus(ctx, room, th) {
  const status = statusOf(ctx, room);
  if (!th || !room.thermostats.includes(th)) return status;
  return thermostatStatus(room, th, { status, states: ctx.gateway.states });
}
function mixed(ctx, room) {
  return mixedTargets(room, { status: statusOf(ctx, room), states: ctx.gateway.states });
}
function shownValue(ctx, room, th) {
  const { drag, pending, shift } = ctx.store.control;
  const setting = [drag, pending].find((item) => item?.room === room.id && item.th === th);
  if (setting) return setting.value;
  const status = controlStatus(ctx, room, th);
  if (shift?.room === room.id && th && typeof shift.base[th] === "number") {
    return snapT(shift.base[th] + shift.delta, status.step);
  }
  const values = th ? null : mixed(ctx, room);
  if (values)
    return snapT(values.reduce((sum, value) => sum + value, 0) / values.length, status.step);
  return status.target;
}
function snapT(value, step) {
  return snap(value, { low: MIN_T, high: MAX_T, step });
}
function scale(ctx) {
  return { low: ctx.config.dial_min, high: ctx.config.dial_max };
}
function allPlanNames(ctx) {
  const names = /* @__PURE__ */ new Map();
  for (const room of ctx.store.data.allRooms) {
    for (const plan2 of room.plans)
      names.set(planName(ctx, room, plan2).toLowerCase(), planName(ctx, room, plan2));
  }
  return [...names.values()].sort((a3, b3) => a3.localeCompare(b3));
}
function exerciseSettings(ctx) {
  return exerciseFromInput(ctx.store.data.allRooms[0]?.cfg?.use_blueprint?.input);
}
function areaOf(ctx, entity) {
  const { entities = {}, devices = {}, areas = {} } = ctx.gateway.hass;
  const entry = entities[entity] || {};
  const area = entry.area_id || devices[entry.device_id]?.area_id;
  return areas[area]?.name || "";
}
function roomEntities(room) {
  const one = [room.entity, room.state, room.heating_switch, room.room_sensor];
  return [...one, ...room.thermostats, ...room.plans, ...room.windows || []].filter(Boolean);
}
function watchedStates(ctx) {
  const ids = new Set((ctx.store.data.rooms || []).flatMap(roomEntities));
  return [...ids].map((id) => ctx.gateway.states[id]?.last_updated).join("|");
}

// src/state/store.js
var NO_DATA = {
  admin: false,
  rooms: null,
  allRooms: [],
  plans: {},
  days: null,
  script: null,
  hasScript: false,
  exceptions: null,
  roomBlueprint: null,
  oldBlueprints: [],
  noDirectory: false,
  error: null,
  notes: {}
};
var FIRST_UI = {
  view: "rooms",
  openRoom: null,
  tab: {},
  plan: {},
  period: null,
  renaming: null,
  addPlan: null,
  settingsPart: null,
  addRoom: null,
  setupPart: null,
  picker: null,
  thermostat: {},
  dayEdit: null,
  layout: "dial",
  message: null,
  confirming: null
};
var NOTHING_EDITED = {
  drafts: { plans: {}, weeks: {}, setups: {}, settings: null, exercise: null },
  control: { pending: null, shift: null, drag: null }
};
function initialState() {
  return structuredClone({ data: NO_DATA, ui: FIRST_UI, ...NOTHING_EDITED });
}
var Store = class {
  /** A store with the initial state. */
  constructor() {
    const state = initialState();
    this.data = state.data;
    this.ui = state.ui;
    this.drafts = state.drafts;
    this.control = state.control;
    this.listeners = /* @__PURE__ */ new Set();
    this.loads = 0;
  }
  /**
   * Call back after every change.
   * @param {() => void} listener
   * @returns {() => void} stops calling back
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  /**
   * Change the state, then tell the listeners.
   * @param {(store: Store) => void} change
   */
  update(change) {
    change(this);
    this.listeners.forEach((listener) => listener());
  }
};

// src/ui/styles/base.js
var base = i`
  :host {
    --wh-free: var(--success-color, #43a047);
    --wh-manual: var(--warning-color, #ffa000);
    --wh-bad: var(--error-color, #db4437);
    --wh-heat: var(--state-climate-heat-color, #ff8a50);
    --wh-cool: var(--state-climate-cool-color, #2b9af9);
    --wh-off: var(--state-climate-off-color, #8a9099);
  }
  ha-card { padding: 12px 12px 8px; }
  /* Buttons use the card's font; the round ± buttons and the toggle keep the browser's. */
  :where(button:not(.round, .toggle)) { font: inherit; color: inherit; }
  :where(button, [tabindex]):focus-visible { outline: 2px solid var(--primary-color); }
  .top { display: flex; align-items: center; gap: 6px; min-height: 36px; }
  .title { font-size: 1.2em; font-weight: 500; }
  .back { border: 0; background: none; color: var(--primary-text-color); font-size: 1.1em;
    font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; padding: 0; }
  .day-chip { border: 0; cursor: pointer; font-size: 0.85em; padding: 2px 8px; border-radius: 10px;
    background: var(--secondary-background-color); color: var(--primary-text-color); }
  .day-chip.free { color: var(--wh-free); }
  .day-chip.on { outline: 2px solid var(--primary-color); }
  .icon-button { border: 0; background: none; color: var(--secondary-text-color); cursor: pointer;
    padding: 4px; border-radius: 50%; display: inline-flex; }
  .icon-button.on { color: var(--primary-color); }
  .banner { padding: 8px 10px; border-radius: 8px; margin: 6px 0; display: flex; gap: 8px;
    justify-content: space-between; align-items: center; font-size: 0.92em; }
  .banner.ok { background: color-mix(in srgb, var(--wh-free) 18%, transparent); }
  .banner.bad { background: color-mix(in srgb, var(--wh-bad) 18%, transparent); }
  .banner.warn { background: color-mix(in srgb, var(--wh-manual) 20%, transparent); }
  .note { padding: 12px 4px; color: var(--secondary-text-color); }
  .btn { border: 0; background: var(--primary-color); color: var(--text-primary-color, #fff);
    padding: 6px 12px; border-radius: 16px; cursor: pointer; }
  .btn.flat { background: none; color: var(--primary-color); }
  .btn.small { padding: 4px 10px; font-size: 0.9em; }
  .btn.outline { border: 1px solid var(--primary-color); }
  .btn[disabled] { opacity: 0.5; cursor: default; }
  .link { border: 0; background: none; color: var(--primary-color); cursor: pointer;
    white-space: nowrap; }
  .btn.flat.asking, .link.asking { color: var(--wh-bad); font-weight: 500; }
  .icon { border: 0; background: none; color: var(--secondary-text-color); cursor: pointer;
    min-width: 32px; min-height: 32px; }
  .icon[disabled] { opacity: 0.35; cursor: default; }
  .round { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--divider-color);
    background: none; color: var(--primary-text-color); font-size: 1.3em; cursor: pointer; }
  .round.small { width: 30px; height: 30px; font-size: 1.1em; }
  .round[disabled] { opacity: 0.35; cursor: default; }
  .chip { font-size: 0.72em; padding: 1px 6px; border-radius: 8px; margin-left: 4px;
    vertical-align: middle; font-weight: 400; }
  .chip.bad { background: color-mix(in srgb, var(--wh-bad) 25%, transparent); }
  button.plain { border: 0; background: none; text-align: left; width: 100%; min-height: 44px;
    cursor: pointer; }
  .panel { border: 1px solid var(--divider-color); border-radius: 8px; padding: 8px; margin: 8px 0;
    }
  .actions { display: flex; gap: 6px; align-items: center; margin-top: 8px; flex-wrap: wrap; }
  .field { display: flex; flex-direction: column; gap: 2px; margin: 6px 0; font-size: 0.9em;
    color: var(--secondary-text-color); }
  .check { display: flex; align-items: center; gap: 6px; font-size: 0.92em; margin: 2px 0; }
  input, select { font: inherit; color: var(--primary-text-color);
    background: var(--card-background-color);
    border: 1px solid var(--divider-color); border-radius: 6px; padding: 4px 6px; min-width: 0;
    box-sizing: border-box; }
  input[type='checkbox'] { width: auto; }
  .error { color: var(--wh-bad); font-size: 0.88em; margin-top: 4px; }
  .save-bar { display: flex; align-items: center; gap: 6px; margin-top: 8px; padding: 6px 8px;
    border-radius: 10px; background: color-mix(in srgb, var(--wh-manual) 14%, transparent);
      font-size: 0.9em; }
  .grow { flex: 1; }
  .block { display: block; }
  .dim { color: var(--secondary-text-color); }
  .small { font-size: 0.85em; }
  .manual { color: var(--wh-manual); }
  .accent { color: var(--primary-color); }
  .ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .picks { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
  .pick { border: 1px solid var(--divider-color); background: none;
    color: var(--primary-text-color);
    border-radius: 14px; padding: 4px 10px; cursor: pointer; font-size: 0.9em; }
  .pick.on { border-color: var(--primary-color);
    background: color-mix(in srgb, var(--primary-color) 15%, transparent); }
  .pick.dirty::after { content: ' ✎'; color: var(--wh-manual); }
  .pick.add { min-width: 2.2em; }
`;

// src/ui/styles/controls.js
var controls = i`
  .thermostats { display: flex; gap: 6px; margin: 10px 0 0; }
  .thermostats button { flex: 1; min-width: 0; display: flex; align-items: center;
    justify-content: center;
    gap: 4px; min-height: 40px; border: 1px solid var(--divider-color); background: none;
    border-radius: 20px; font-size: 0.92em; cursor: pointer; padding: 4px 6px; }
  .thermostats button.on { border: 2px solid var(--primary-color); font-weight: 500;
    background: color-mix(in srgb, var(--primary-color) 14%, transparent); }
  .thermostats .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
    }
  .thermostats .name + span { flex: none; }
  .dial-box { position: relative; max-width: 280px; margin: 4px auto 0; }
  .dial-box svg { display: block; width: 100%; height: auto; touch-action: none; cursor: pointer;
    outline: none; user-select: none; -webkit-user-select: none; }
  .dial-box svg:focus-visible .dial-handle { stroke-width: 5; }
  .dial-buttons { position: absolute; left: 0; right: 0; bottom: 2%; display: flex;
    align-items: center; gap: 12px; justify-content: space-between; padding: 0 4%;
    pointer-events: none; }
  .dial-buttons .round { pointer-events: auto; background: var(--card-background-color); }
  .dial-track { fill: none; stroke: var(--secondary-background-color, #e5e5e5); stroke-width: 12;
    stroke-linecap: round; }
  .dial-fill { fill: none; stroke: var(--wh-heat); stroke-width: 12; stroke-linecap: round; }
  .dial-handle { fill: var(--card-background-color, #fff); stroke: var(--wh-heat); stroke-width: 4;
    }
  .dial-fill.off, .dial-handle.off { stroke: var(--wh-off); }
  .dial-room { stroke: var(--primary-text-color); stroke-width: 3; stroke-linecap: round; }
  .dial-plan { fill: var(--wh-manual); }
  .dial-box text { text-anchor: middle; fill: var(--primary-text-color); font-family: inherit; }
  .dial-status { font-size: 11px; }
  .dial-box .dial-status.dim, .dial-box .dial-small { fill: var(--secondary-text-color); }
  .dial-box .dial-status.heat, .dial-box .dial-status .heat { fill: var(--wh-heat); }
  .dial-box .dial-status.manual { fill: var(--wh-manual); }
  .dial-box .dial-status.window { fill: var(--wh-cool); }
  .dial-box .dial-status.ok { fill: var(--wh-free); }
  .dial-value { font-size: 46px; font-weight: 300; }
  .dial-value.off { font-size: 34px; }
  .dial-value.mixed { font-size: 30px; }
  .dial-unit { font-size: 15px; }
  .dial-small { font-size: 10.5px; }
  .slider { margin: 10px 0 4px; outline: none; user-select: none; -webkit-user-select: none; }
  .slider.framed {
    border: 1px solid var(--divider-color); border-radius: 8px; padding: 8px 10px 4px;
    }
  .slider-top { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
  .slider-value { font-size: 2.1em; font-weight: 300; }
  .slider-status { font-size: 0.9em; color: var(--secondary-text-color); }
  .slider-status.heat, .slider-status .heat { color: var(--wh-heat); }
  .slider-status.manual { color: var(--wh-manual); }
  .slider-status.window { color: var(--wh-cool); }
  .slider-status.ok { color: var(--wh-free); }
  .slider-bar { position: relative; height: 36px; margin: 2px 12px 0; cursor: pointer;
    touch-action: pan-y; }
  .slider-track, .slider-fill { position: absolute; left: 0; top: 14px; height: 8px;
    border-radius: 4px; }
  .slider-track { right: 0; background: var(--secondary-background-color, #e5e5e5); }
  .slider-fill { background: var(--wh-heat); }
  .slider-fill.off { background: var(--wh-off); }
  .slider-room { position: absolute; top: 7px; width: 3px; height: 22px; margin-left: -1.5px;
    border-radius: 2px; background: var(--primary-text-color); }
  .slider-plan { position: absolute; top: 27px; width: 6px; height: 6px; margin-left: -3px;
    border-radius: 50%; background: var(--wh-manual); }
  .slider-knob { position: absolute; top: 6px; width: 24px; height: 24px; margin-left: -12px;
    border-radius: 50%; box-sizing: border-box; background: var(--card-background-color, #fff);
    border: 4px solid var(--wh-heat); }
  .slider-knob.off { border-color: var(--wh-off); }
  .slider:focus-visible .slider-knob {
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary-color) 35%, transparent);
    }
  .slider-scale { display: flex; justify-content: space-between; font-size: 0.72em;
    color: var(--secondary-text-color); }
  .all-row { display: flex; align-items: center; gap: 8px; border: 1px dashed var(--divider-color);
    border-radius: 8px; padding: 8px 10px; margin: 6px 0; }
  .pill { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap;
    border-radius: 10px;
    background: var(--secondary-background-color); padding: 8px 12px; margin: 8px 0;
      font-size: 0.92em; }
  .thermostat { display: flex; justify-content: space-between; gap: 8px; font-size: 0.9em;
    padding: 1px 0; }
  .back-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
  .foot { display: flex; justify-content: flex-end; }
`;

// src/ui/styles/forms.js
var forms = i`
  .setup { margin: 8px 0; }
  .section { border: 1px solid var(--divider-color); border-radius: 8px; margin: 6px 0; }
  .section.open { background: color-mix(in srgb, var(--primary-text-color) 3%, transparent); }
  .section-head { display: flex; align-items: center; gap: 8px; padding: 8px 10px; }
  .section-title { font-weight: 500; flex: none; }
  .section-body { padding: 0 10px 10px; display: flex; flex-direction: column; gap: 8px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .entity-chip { display: inline-flex; align-items: center; gap: 2px; border-radius: 16px;
    background: var(--secondary-background-color); padding: 2px 2px 2px 12px; font-size: 0.92em; }
  .x { border: 0; background: none; color: var(--secondary-text-color); width: 32px; height: 32px;
    border-radius: 16px; cursor: pointer; flex: none; }
  .add-chip { border: 1px dashed var(--divider-color); background: none;
    color: var(--primary-color);
    border-radius: 16px; padding: 6px 12px; font-size: 0.92em; cursor: pointer; }
  .entry { display: flex; align-items: center; gap: 8px; border: 1px solid var(--divider-color);
    border-radius: 8px; padding: 6px 4px 6px 10px; background: var(--card-background-color); }
  .entry ha-icon { color: var(--wh-heat); flex: none; }
  .stepper { display: flex; align-items: center; gap: 8px; }
  .stepper .value { min-width: 64px; text-align: center; font-weight: 500; }
  .picker { border: 1px solid var(--divider-color); border-radius: 8px; overflow: hidden;
    background: var(--card-background-color); }
  .search { display: flex; align-items: center; gap: 6px; padding: 4px 8px;
    border-bottom: 1px solid var(--divider-color); color: var(--secondary-text-color); }
  .search input { flex: 1; border: 0; padding: 8px 2px; outline: none; background: none; }
  .picker-list { max-height: 320px; overflow-y: auto; margin-top: 6px; }
  .picker-group { font-size: 0.8em; color: var(--secondary-text-color); padding: 8px 10px 2px; }
  .picker-group:empty { display: none; }
  .picker-item { display: block; width: 100%; border: 0; background: none; text-align: left;
    color: var(--primary-text-color); padding: 6px 10px; cursor: pointer; }
  .picker-item:hover, .picker-item:focus-visible {
    background: color-mix(in srgb, var(--primary-color) 12%, transparent);
    }
  .day { border-top: 1px solid var(--divider-color); padding: 6px 2px; }
  .day:first-child { border-top: 0; }
  .day-row { display: grid; grid-template-columns: 7.5em 1fr; gap: 0 8px; cursor: pointer;
    width: 100%;
    border: 0; background: none; text-align: left; padding: 0; }
  .day-kind { font-weight: 500; }
  .day.free .day-kind { color: var(--wh-free); }
  .day.exception .day-kind::after { content: ' ✎'; color: var(--wh-manual); }
  .day-reason { grid-column: 2; font-size: 0.88em; }
  .day-plans { grid-column: 2; font-size: 0.85em; }
  .settings-title { font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.04em;
    margin: 14px 0 4px;
    color: var(--secondary-text-color); }
  .settings-row { border-top: 1px solid var(--divider-color); }
  .settings-head { display: flex; align-items: center; gap: 8px; padding: 10px 2px; }
  .rule-row { display: grid; grid-template-columns: 1fr 1fr 2.2em 2.2em; gap: 6px; margin: 3px 0; }
  @media (max-width: 420px) { .day-row { grid-template-columns: 6.2em 1fr; } }
`;

// src/ui/styles/plan.js
var plan = i`
  .pinfo { margin: 2px 0 6px; }
  .chart { position: relative; height: 88px; border-radius: 8px; overflow: hidden;
    background: var(--secondary-background-color); }
  .chart-segment { position: absolute; top: 0; bottom: 0; display: flex; align-items: flex-end;
    box-sizing: border-box; border: 0; border-right: 1px solid var(--card-background-color, #fff);
    background: none; padding: 0; }
  button.chart-segment { cursor: pointer; }
  .chart-segment.selected { box-shadow: inset 0 0 0 2px var(--primary-text-color); }
  .chart-bar { width: 100%; display: flex; justify-content: center; align-items: flex-start;
    font-size: 0.72em; color: #fff; padding-top: 3px; box-sizing: border-box; overflow: hidden; }
  .chart-segment.off .chart-bar { background: repeating-linear-gradient(135deg,
    var(--wh-off) 0 4px, color-mix(in srgb, var(--wh-off) 75%, #000) 4px 8px); }
  .chart-now { position: absolute; top: -2px; bottom: -2px; width: 2px;
    background: var(--primary-text-color); }
  .chart-ticks { display: flex; justify-content: space-between; font-size: 0.68em;
    color: var(--secondary-text-color); }
  .period-list { margin-top: 6px; }
  .period-row { display: flex; width: 100%; padding: 9px 4px; border: 0; background: none;
    border-bottom: 1px solid var(--divider-color); text-align: left; }
  button.period-row { cursor: pointer; }
  .period-row.current { font-weight: 500; color: var(--primary-color); }
  .period-edit { display: grid; grid-template-columns: minmax(6.5em, 8em) auto auto 2em; gap: 8px;
    align-items: center; padding: 6px 4px; border-bottom: 1px solid var(--divider-color);
    background: color-mix(in srgb, var(--primary-color) 6%, transparent); }
  .temperature-step { display: flex; align-items: center; gap: 6px; }
  .temperature-step span { min-width: 4em; text-align: center; }
  .week { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 6px 10px;
    margin: 8px 0; }
  .week-day { display: flex; align-items: center; gap: 6px; }
  .week-day span { width: 2.4em; flex: none; }
  .week-day select { flex: 1; }
  .week-row { display: flex; justify-content: space-between; align-items: center; gap: 8px;
    margin: 8px 0 4px; }
  @media (max-width: 420px) {
    .period-edit { grid-template-columns: 1fr auto 2em; }
    .period-edit .check { grid-column: 1; grid-row: 2; }
  }
`;

// src/ui/styles/rooms.js
var rooms = i`
  .room { border-top: 1px solid var(--divider-color); padding: 8px 2px; }
  .room:first-child { border-top: 0; }
  .room-head { display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 4px 0;
    width: 100%; border: 0; background: none; text-align: left; }
  .room-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center;
    justify-content: center; flex: none; --c: var(--secondary-text-color);
    background: color-mix(in srgb, var(--c) 18%, transparent); color: var(--c); }
  .room-icon.heat, .room-line.heat { --c: var(--wh-heat); }
  .room-icon.ok, .room-line.ok { --c: var(--wh-free); }
  .room-icon.manual, .room-line.manual { --c: var(--wh-manual); }
  .room-icon.window, .room-line.window { --c: var(--wh-cool); }
  .room-icon.paused, .room-line.paused { --c: var(--secondary-text-color); }
  .room-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .room-name { font-weight: 500; }
  .room-line { color: var(--c); font-size: 0.9em; white-space: nowrap; overflow: hidden;
    text-overflow: ellipsis; }
  .room-temp { font-size: 1.9em; font-weight: 300; text-align: right; }
  .chevron { color: var(--secondary-text-color); flex: none; }
  /* On a narrow card the heating switch goes to its own line, and the tabs scroll if needed. */
  .room-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 10px 0 4px; }
  .tabs { display: inline-flex; background: var(--secondary-background-color); border-radius: 18px;
    padding: 3px; max-width: 100%; box-sizing: border-box; overflow-x: auto;
    scrollbar-width: none; }
  .tabs button { flex: none; white-space: nowrap; border: 0; background: none;
    color: var(--secondary-text-color); font-size: 0.92em; padding: 5px 12px; border-radius: 15px;
    cursor: pointer; }
  .tabs button.on { background: var(--card-background-color); color: var(--primary-text-color);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); }
  .switch { display: inline-flex; align-items: center; gap: 8px; font-size: 0.9em;
    margin-left: auto; color: var(--secondary-text-color); }
  .toggle { width: 40px; height: 22px; border-radius: 11px; border: 0; position: relative;
    background: var(--disabled-color, #bdbdbd); cursor: pointer; padding: 0; }
  .toggle i { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px;
    border-radius: 50%;
    background: #fff; transition: left 0.15s; }
  .toggle.on { background: var(--wh-heat); }
  .toggle.on i { left: 21px; }
  .toggle[disabled] { opacity: 0.4; cursor: default; }
  @media (prefers-reduced-motion: reduce) { .toggle i { transition: none; } }
`;

// src/ui/styles/index.js
var STYLES = [base, rooms, controls, plan, forms];

// src/ha/helpers.js
function helperOf(gateway, domain, id) {
  const remove = () => gateway.ws({ type: `${domain}/delete`, [`${domain}_id`]: id });
  return { entity: `${domain}.${id}`, id, remove };
}
async function createStateHelper(gateway, name) {
  const create = { type: "input_text/create", name, max: STATE_MAX, icon: "mdi:database" };
  const item = await gateway.ws(create);
  return helperOf(gateway, "input_text", item.id);
}
async function createSwitch(gateway, name) {
  const create = { type: "input_boolean/create", name, icon: "mdi:radiator", initial: true };
  const helper = helperOf(gateway, "input_boolean", (await gateway.ws(create)).id);
  await waitFor(() => gateway.states[helper.entity]);
  if (gateway.states[helper.entity]?.state !== "on") {
    await gateway.service("input_boolean", "turn_on", { entity_id: helper.entity });
  }
  return helper;
}

// src/ha/rooms-admin.js
async function freeRoomId(gateway, { name, rooms: rooms2 }) {
  const slug = slugify(name);
  if (!slug) throw new CardError("room_name");
  const id = `weekheat_${slug}`;
  const known = rooms2.some((room) => room.id === id);
  if (known || await gateway.readConfig(`automation/config/${id}`)) {
    throw new CardError("room_exists", { id });
  }
  return id;
}
function roomInput(room, { weekday, free, state, sw }) {
  return {
    room_name: room.name,
    thermostats: room.thermostats,
    plans: [weekday.entity, free.entity],
    free_day: free.entity,
    week: Object.fromEntries(WEEK.map((day) => [day, weekday.entity])),
    state: state.entity,
    heating_switch: sw.entity,
    ...room.defaults
  };
}
async function createAutomation(gateway, room, input) {
  const use = { path: room.blueprint, input };
  const cfg = { alias: `Weekheat ${room.name}`, description: "Weekheat", use_blueprint: use };
  await gateway.saveConfig(`automation/config/${room.id}`, { ...cfg, initial_state: false });
  const loaded = () => Object.values(gateway.states).find(
    (state) => state.entity_id.startsWith("automation.") && state.attributes.id === room.id
  );
  const automation = await waitFor(loaded);
  if (automation)
    await gateway.service("automation", "turn_off", { entity_id: automation.entity_id });
  await gateway.saveConfig(`automation/config/${room.id}`, cfg);
}
function keeper(made) {
  return (thing) => {
    made.push(thing);
    return thing;
  };
}
async function createRoom(gateway, room, made) {
  const keep = keeper(made);
  const plan2 = (name, periods) => createPlan(gateway, { room: room.name, name, periods });
  const weekday = keep(await plan2(room.planNames.working, STARTER.weekday));
  const free = keep(await plan2(room.planNames.free, STARTER.free));
  const state = keep(await createStateHelper(gateway, `Weekheat ${room.name} state`));
  const sw = keep(await createSwitch(gateway, room.switchName));
  keep({ remove: () => gateway.deleteConfig(`automation/config/${room.id}`) });
  await createAutomation(gateway, room, roomInput(room, { weekday, free, state, sw }));
}
async function removeAll(made) {
  for (const thing of [...made].reverse()) {
    try {
      await thing.remove();
    } catch (error) {
      console.warn("Weekheat: removing a part of a room that was not finished failed", error);
    }
  }
}
async function addRoom(gateway, room) {
  checkStateSize(room.thermostats);
  const id = await freeRoomId(gateway, room);
  const made = [];
  try {
    await createRoom(gateway, { ...room, id }, made);
  } catch (error) {
    await removeAll(made);
    throw error;
  }
}

// src/state/actions/admin.js
function setNewRoomName(ctx, name) {
  ctx.store.update(({ ui }) => ui.addRoom.name = name);
}
function newRoom(ctx) {
  const text = texts(ctx);
  const { name, thermostats } = ctx.store.ui.addRoom;
  const defaults = {
    day_script: ctx.config.day_script,
    language: lang(ctx),
    ...exerciseSettings(ctx)
  };
  const planNames = { working: text.working_day, free: text.free_day };
  const { allRooms: rooms2, roomBlueprint: blueprint } = ctx.store.data;
  const base2 = { name: name.trim(), thermostats, planNames, rooms: rooms2, blueprint, defaults };
  return { ...base2, switchName: `Weekheat ${name.trim()} ${text.heating_l}` };
}
async function commitNewRoom(ctx) {
  const form = ctx.store.ui.addRoom;
  if (!form.name.trim() || !form.thermostats.length) return false;
  const done = await save(ctx, () => addRoom(ctx.gateway, newRoom(ctx)));
  if (!done) return false;
  ctx.store.update(({ ui }) => Object.assign(ui, { addRoom: null, settingsPart: null }));
  flash(ctx, { key: "new_room_paused", bad: false });
  await load(ctx);
  return true;
}
async function updateOldBlueprints(ctx) {
  const done = await save(ctx, () => updateBlueprints(ctx.gateway, ctx.store.data.oldBlueprints));
  if (done) await load(ctx);
  return done;
}

// src/ui/describe.js
function describe(text, error) {
  if (error instanceof CardError && text[`err_${error.code}`]) {
    return fill(text[`err_${error.code}`], error.values);
  }
  return errorText(error);
}

// src/ui/views/banners.js
function message(ctx) {
  const shown = ctx.store.ui.message;
  if (!shown) return A;
  const text = texts(ctx);
  const words = shown.bad ? `${text.error}: ${describe(text, shown.error)}` : text[shown.key];
  return b2`<div class="banner ${shown.bad ? "bad" : "ok"}" role="status">${words}</div>`;
}
function problems(ctx) {
  const { data } = ctx.store;
  const text = texts(ctx);
  const error = data.error ? b2`<div class="banner bad">${describe(text, data.error)}</div>` : A;
  const noScript = data.rooms && data.admin && !data.script;
  return b2`${error}${noScript ? b2`<div class="banner bad">${text.no_script}</div>` : A}`;
}
function blueprintWords(ctx) {
  const text = texts(ctx);
  const older = ctx.store.data.oldBlueprints.find((blueprint) => !blueprint.current);
  if (!older) return text.bp_no_exercise;
  const versions = { installed: older.installed || text.bp_none, needed: BLUEPRINT_VERSION };
  return fill(text.bp_old, versions);
}
function oldBlueprints(ctx) {
  if (!ctx.store.data.admin || !ctx.store.data.oldBlueprints.length) return A;
  const text = texts(ctx);
  return b2`<div class="banner warn">
    <span>${blueprintWords(ctx)}</span>
    <button class="btn small" @click=${() => updateOldBlueprints(ctx)}>${text.bp_update}</button>
  </div>`;
}
function notes(ctx) {
  const label = texts(ctx).dismiss;
  return weekheatNotes(ctx.store.data.notes).map(
    (note) => b2`<div class="banner warn">
        <span>${note.message}</span>
        <button class="link" @click=${() => dismiss(ctx, note.notification_id)}>${label}</button>
      </div>`
  );
}
function banners(ctx) {
  return b2`${message(ctx)}${problems(ctx)}${oldBlueprints(ctx)}${notes(ctx)}`;
}

// src/domain/format.js
var COLD = 14;
var WARM = 24;
var clockFormats = /* @__PURE__ */ new Map();
function dateLocale(lang2) {
  return lang2 === "de" ? "de-AT" : "en-GB";
}
function formatNumber(value, format, { min = 0, max = 1 } = {}) {
  const digits = { minimumFractionDigits: min, maximumFractionDigits: max };
  const options2 = { ...digits, useGrouping: format.grouping };
  return Number(value).toLocaleString(format.numbers, options2);
}
function formatTemp(value, format) {
  return value == null ? "\u2013" : `${formatNumber(value, format)} \xB0C`;
}
function clockFormat(locale) {
  if (!clockFormats.has(locale)) {
    const options2 = { hour: "numeric", minute: "2-digit", hourCycle: "h12", timeZone: "UTC" };
    clockFormats.set(locale, new Intl.DateTimeFormat(locale, options2));
  }
  return clockFormats.get(locale);
}
function formatTime(minutes, format) {
  if (!format.hour12) return fromMin(minutes);
  return clockFormat(format.language).format(Date.UTC(2e3, 0, 1, 0, minutes));
}
function formatPeriod(period, format, text) {
  if (!period) return "\u2013";
  if (period.off) return text.off;
  return formatTemp(periodTemp(period), format);
}
function targetsText(targets2, format) {
  const values = targets2.filter((value) => typeof value === "number");
  if (!values.length) return "\u2013";
  if (values.every((value) => Math.abs(value - values[0]) < SAME_SHOWN))
    return formatTemp(values[0], format);
  return `${values.map((value) => formatNumber(value, format)).join(" / ")} \xB0C`;
}
function count(amount, [one, many]) {
  return `${amount} ${amount === 1 ? one : many}`;
}
function tempColor(temperature) {
  const x2 = Math.max(0, Math.min(1, (temperature - COLD) / (WARM - COLD)));
  const hue = 210 - x2 * 195;
  return `hsl(${Math.round(hue)}, 70%, ${Math.round(55 - x2 * 5)}%)`;
}
function reasonText(day, text) {
  if (day.kind === "weekend") return text.weekdays[day.weekday] || text.reason_weekend;
  if (day.kind === "holiday") return day.detail ? `${text.holiday}: ${day.detail}` : text.holiday;
  if (day.kind === "calendar") return `${day.source || text.calendar}: ${day.detail}`;
  if (day.kind === "exception") return day.note ? `${text.exception}: ${day.note}` : text.exception;
  return "";
}

// src/ha/controls.js
function setTemperature(gateway, thermostats, temperature) {
  return gateway.service("climate", "set_temperature", { entity_id: thermostats, temperature });
}
function setEach(gateway, writes) {
  return Promise.all(
    writes.map(([thermostat, value]) => setTemperature(gateway, [thermostat], value))
  );
}
function setSwitch(gateway, entity, on) {
  return gateway.service("input_boolean", on ? "turn_on" : "turn_off", { entity_id: entity });
}
function setRoomActive(gateway, entity, on) {
  return gateway.service("automation", on ? "turn_on" : "turn_off", { entity_id: entity });
}
async function triggerRooms(gateway, automations) {
  const active = automations.filter((entity) => gateway.states[entity]?.state === "on");
  if (!active.length) return void 0;
  return gateway.service("automation", "trigger", { entity_id: active, skip_condition: true });
}
function runExercise(gateway) {
  return gateway.ws({ type: "fire_event", event_type: "weekheat_exercise" });
}

// src/state/actions/rooms.js
async function commitRoom(ctx, room, input) {
  const saved = await saveRoom(ctx.gateway, room, input);
  const replace = (rooms2) => rooms2?.map((item) => item.id === room.id ? saved : item);
  ctx.store.update((store) => {
    store.data.rooms = replace(store.data.rooms);
    store.data.allRooms = replace(store.data.allRooms);
  });
  await publishHome(ctx);
  return saved;
}
function poke(ctx, rooms2 = ctx.store.data.rooms || []) {
  return triggerRooms(
    ctx.gateway,
    rooms2.map((room) => room.entity)
  );
}

// src/state/actions/days.js
function dayForm(ctx, date) {
  const day = (ctx.store.data.days || []).find((item) => item.date === date);
  if (day?.kind !== "exception") return { date, pick: "auto", note: "" };
  const kind = day.free ? "free" : "working";
  return { date, pick: day.plan ? `plan:${day.plan}` : kind, note: day.note || "" };
}
function toggleDay(ctx, date) {
  ctx.store.update(
    ({ ui }) => ui.dayEdit = ui.dayEdit?.date === date ? null : dayForm(ctx, date)
  );
}
function editDay(ctx, change) {
  ctx.store.update(({ ui }) => Object.assign(ui.dayEdit, change));
}
function cancelDay(ctx) {
  ctx.store.update(({ ui }) => ui.dayEdit = null);
}
function exceptionOf({ pick: pick2, note }) {
  const kinds = { working: { free: false }, free: { free: true } };
  const exception = pick2.startsWith("plan:") ? { plan: pick2.slice(5) } : kinds[pick2] || null;
  return exception && note.trim() ? { ...exception, note: note.trim() } : exception;
}
async function reloadDays(ctx) {
  const days = await loadDayList(ctx);
  ctx.store.update(({ ui, data }) => {
    ui.dayEdit = null;
    data.days = days;
  });
}
function commitDay(ctx) {
  const form = ctx.store.ui.dayEdit;
  const calendar = ctx.store.data.exceptions;
  const change = { calendar, date: form.date, exception: exceptionOf(form), lang: lang(ctx) };
  return save(ctx, async () => {
    await setException(ctx.gateway, change);
    await reloadDays(ctx);
    if (form.date === now(ctx).date) await poke(ctx);
  });
}

// src/ui/views/parts.js
function button(label, onClick, { kind = "btn small", disabled = false, aria = void 0 } = {}) {
  return b2`<button class=${kind} ?disabled=${disabled} aria-label=${aria ?? label}
    @click=${onClick}>${label}</button>`;
}
function textField(label, value, onInput) {
  return b2`<label class="field">${label}
    <input .value=${String(value ?? "")} @input=${(event) => onInput(event.target.value)}></label>`;
}
function numberField(label, value, { min, max, step, onInput }) {
  return b2`<label class="field">${label}
    <input type="number" inputmode="numeric" min=${min} max=${max} step=${step}
      .value=${String(value)} @input=${(event) => onInput(event.target.value)}></label>`;
}
function options(list, selected) {
  return list.map(
    ([value, label]) => b2`<option value=${value} ?selected=${value === selected}>${label}</option>`
  );
}
function selectField(label, { list, selected, onChange, disabled = false }) {
  return b2`<label class="field">${label}
    <select ?disabled=${disabled} @change=${(event) => onChange(event.target.value)}>
      ${options(list, selected)}</select></label>`;
}
function actionRow(...items) {
  return b2`<div class="actions"><span class="grow"></span>${items}</div>`;
}
function saveBar([unsaved, cancel, save2], actions) {
  return b2`<div class="save-bar"><span>${unsaved}</span><span class="grow"></span>
    ${button(cancel, actions.cancel, { kind: "btn flat small" })}
    ${button(save2, actions.save, { disabled: actions.disabled })}</div>`;
}

// src/ui/views/days.js
function dayName(ctx, day) {
  const text = texts(ctx);
  const today2 = now(ctx).date;
  const names = { [today2]: text.today, [addDays(today2, 1)]: text.tomorrow };
  const format = new Intl.DateTimeFormat(dateLocale(lang(ctx)), {
    day: "numeric",
    month: "numeric"
  });
  const date = format.format(/* @__PURE__ */ new Date(`${day.date}T12:00:00Z`));
  return b2`<span class="day-date">${names[day.date] || text.wd_short[day.weekday]}
    <span class="dim">${date}</span></span>`;
}
function plansOfDay(ctx, day) {
  const friendly = friendlyNames(ctx);
  const planOf2 = (room) => planName(ctx, room, planForDay(room, day, friendly));
  const each = ctx.store.data.rooms.map((room) => [room.name, planOf2(room)]);
  const same = each.length > 1 && each.every(([, plan2]) => plan2 === each[0][1]);
  if (same) return `${texts(ctx).all_rooms}: ${each[0][1]}`;
  return each.map(([room, plan2]) => `${room}: ${plan2}`).join(" \xB7 ");
}
function dayChoices(ctx) {
  const text = texts(ctx);
  const plans = allPlanNames(ctx).map((name) => [`plan:${name}`, `${text.plan}: ${name}`]);
  const fixed = [
    ["auto", text.as_decided],
    ["working", text.working_day],
    ["free", text.free_day]
  ];
  return (
    /** @type {Array<[string, string]>} */
    [...fixed, ...plans]
  );
}
function dayButtons(ctx, picked) {
  const kind = (value) => ({ kind: `pick ${picked === value ? "on" : ""}` });
  const choose = (value) => () => editDay(ctx, { pick: value });
  return dayChoices(ctx).map(([value, label]) => button(label, choose(value), kind(value)));
}
function dayForm2(ctx) {
  const text = texts(ctx);
  const form = ctx.store.ui.dayEdit;
  const typed = (value) => editDay(ctx, { note: value });
  const note = form.pick === "auto" ? A : textField(text.note, form.note, typed);
  const cancel = button(text.cancel, () => cancelDay(ctx), { kind: "btn flat small" });
  const save2 = button(text.save, () => commitDay(ctx));
  const picks = b2`<div class="picks">${dayButtons(ctx, form.pick)}</div>`;
  return b2`<div class="panel">${picks}${note}${actionRow(cancel, save2)}</div>`;
}
function dayView(ctx, day) {
  const text = texts(ctx);
  const reason = reasonText(day, text);
  const kind = `${day.free ? text.free_day : text.working_day}${day.plan ? ` \xB7 ${day.plan}` : ""}`;
  const open = ctx.store.ui.dayEdit?.date === day.date;
  const classes = `day ${day.free ? "free" : ""} ${day.kind === "exception" ? "exception" : ""}`;
  return b2`<div class=${classes}>
    <button class="day-row" aria-expanded=${open} @click=${() => toggleDay(ctx, day.date)}>
      ${dayName(ctx, day)}<span class="day-kind">${kind}</span>
      ${reason ? b2`<span class="day-reason dim">${reason}</span>` : A}
      <span class="day-plans dim">${plansOfDay(ctx, day)}</span></button>
    ${open ? dayForm2(ctx) : A}</div>`;
}
function daysView(ctx) {
  const days = ctx.store.data.days;
  if (!days) return b2`<div class="note">${texts(ctx).no_script}</div>`;
  return days.map((day) => dayView(ctx, day));
}

// src/state/actions/control.js
var WRITE_DELAY = { drag: 300, step: 700 };
var HOLD_MS = 4e3;
function holdShown(ctx, kind, item) {
  const release = () => ctx.store.control[kind] === item && ctx.store.update(({ control }) => control[kind] = null);
  setTimeout(release, HOLD_MS);
}
async function writePending(ctx) {
  clearTimeout(ctx.timers.pending);
  const pending = ctx.store.control.pending;
  const room = pending && findRoom(ctx, pending.room);
  if (!room) return;
  const thermostats = pending.th ? [pending.th] : room.thermostats;
  await attempt(ctx, () => setTemperature(ctx.gateway, thermostats, pending.value));
  holdShown(ctx, "pending", pending);
}
function setTarget(ctx, room, { value, th = "", delay }) {
  const target = snapT(value, controlStatus(ctx, room, th).step);
  const pending = ctx.store.control.pending;
  if (pending && (pending.room !== room.id || pending.th !== th)) writePending(ctx);
  ctx.store.update(({ control }) => control.pending = { room: room.id, th, value: target });
  clearTimeout(ctx.timers.pending);
  ctx.timers.pending = setTimeout(() => writePending(ctx), delay);
}
function stepTarget(ctx, room, { th, steps }) {
  const status = controlStatus(ctx, room, th);
  const base2 = shownValue(ctx, room, th) ?? status.wanted ?? 20;
  setTarget(ctx, room, { value: base2 + steps * status.step, th, delay: WRITE_DELAY.step });
}
function shiftAll(ctx, room, steps) {
  const status = statusOf(ctx, room);
  ctx.store.update(({ control }) => {
    if (control.shift?.room !== room.id)
      control.shift = { room: room.id, base: baseOf(ctx, room), delta: 0 };
    control.shift.delta = Math.round((control.shift.delta + steps * status.step) * 10) / 10;
  });
  clearTimeout(ctx.timers.shift);
  ctx.timers.shift = setTimeout(() => writeShift(ctx, room), WRITE_DELAY.step);
}
function baseOf(ctx, room) {
  return Object.fromEntries(
    room.thermostats.map((th) => [th, controlStatus(ctx, room, th).target])
  );
}
async function writeShift(ctx, room) {
  const shift = ctx.store.control.shift;
  const step = statusOf(ctx, room).step;
  const known = Object.entries(shift.base).filter(([, value]) => typeof value === "number");
  const writes = known.map(
    ([th, value]) => (
      /** @type {[string, number]} */
      [th, snapT(value + shift.delta, step)]
    )
  );
  await attempt(ctx, () => setEach(ctx.gateway, writes));
  holdShown(ctx, "shift", shift);
}
function backToPlan(ctx, room) {
  const { wanted } = statusOf(ctx, room);
  if (wanted == null) return Promise.resolve(false);
  ctx.store.update(({ control }) => Object.assign(control, { pending: null, shift: null }));
  return attempt(ctx, () => setTemperature(ctx.gateway, room.thermostats, wanted));
}
async function addSwitch(ctx, room) {
  if (!ctx.store.data.admin) throw new CardError("no_switch");
  const made = await createSwitch(ctx.gateway, `Weekheat ${room.name} ${texts(ctx).heating_l}`);
  await commitRoom(ctx, room, { heating_switch: made.entity });
  await waitForReload(ctx.gateway, room.entity);
  await setSwitch(ctx.gateway, made.entity, false);
}
function togglePower(ctx, room) {
  const sw = room.heating_switch && ctx.gateway.states[room.heating_switch];
  if (!sw) return attempt(ctx, () => addSwitch(ctx, room));
  return attempt(ctx, () => setSwitch(ctx.gateway, room.heating_switch, sw.state === "off"));
}
function toggleActive(ctx, room) {
  const active = ctx.gateway.states[room.entity]?.state === "on";
  return attempt(ctx, () => setRoomActive(ctx.gateway, room.entity, !active));
}
function dragTo(ctx, room, { th, value }) {
  if (ctx.store.control.drag?.value === value) return;
  ctx.store.update(({ control }) => control.drag = { room: room.id, th, value });
}
function endDrag(ctx, { cancelled }) {
  const drag = ctx.store.control.drag;
  ctx.store.update(({ control }) => control.drag = null);
  const room = drag && !cancelled && drag.value != null && findRoom(ctx, drag.room);
  if (room) setTarget(ctx, room, { value: drag.value, th: drag.th, delay: WRITE_DELAY.drag });
}

// src/ui/status.js
var MODES = {
  paused: { icon: "mdi:pause", list: "paused", control: "dim", word: "paused" },
  exercise: { icon: "mdi:pipe-valve", list: "window", control: "window", word: "exercise" },
  "heating-off": { icon: "mdi:power", list: "paused", control: "dim", word: "heating_off" },
  window: {
    icon: "mdi:window-open-variant",
    list: "window",
    control: "window",
    word: "window_open"
  },
  "valve-closed": { icon: "mdi:valve-closed", list: "ok", control: "ok", word: "rc_closed" },
  manual: {
    icon: "mdi:hand-back-right-outline",
    list: "manual",
    control: "manual",
    word: "manual"
  },
  heating: { icon: "mdi:fire", list: "heat", control: "heat", word: "heating" },
  scheduled: { icon: "mdi:check", list: "ok", control: "dim", word: "scheduled" }
};
function lookOf(status) {
  const mode = roomMode(status);
  const look = { mode, ...MODES[mode] };
  if (mode === "valve-closed" && status.manual)
    return { ...look, list: "manual", control: "manual" };
  return look;
}
function untilText(ctx, status) {
  const next = status.at?.next;
  return next ? ` ${texts(ctx).until} ${formatTime(next.start, formatting(ctx))}` : "";
}
function targets(ctx, room, status) {
  if (room.thermostats.length < 2) return formatTemp(status.target, formatting(ctx));
  const each = room.thermostats.map(
    (th) => thermostatStatus(room, th, { status, states: ctx.gateway.states })
  );
  return targetsText(
    each.map((item) => item.target),
    formatting(ctx)
  );
}
function statusLine(ctx, room, status) {
  const text = texts(ctx);
  const mode = roomMode(status);
  const temp = (value) => formatTemp(value, formatting(ctx));
  const set = () => `${targets(ctx, room, status)}${untilText(ctx, status)}`;
  const lines = {
    paused: () => status.target != null ? `${text.paused} \xB7 ${temp(status.target)}` : text.paused,
    window: () => `${text.window_open} \xB7 ${temp(OFF_T)}`,
    "valve-closed": () => `${text.rc_closed} \xB7 ${set()}`,
    manual: () => `${text.manual} \xB7 ${set()}`,
    heating: () => `${text.heating} \xB7 ${text.to} ${set()}`,
    scheduled: () => scheduledLine(ctx, status)
  };
  return lines[mode] ? lines[mode]() : text[MODES[mode].word];
}
function scheduledLine(ctx, status) {
  if (!status.at) return "\u2013";
  const text = texts(ctx);
  const until = untilText(ctx, status) || ` ${text.until} ${text.tomorrow_l}`;
  return `${formatPeriod(status.at.period, formatting(ctx), text)}${until}`;
}
function controlWord(ctx, status, { named }) {
  const look = lookOf(status);
  const word = texts(ctx)[look.word];
  const shown = status.label && named ? `${status.label} \xB7 ${word}` : word;
  return { word: shown, look: look.control, heats: status.heating && look.control !== "heat" };
}

// src/ui/pointer.js
var RING = { inside: 28, outside: 22 };
var KEY_STEPS = {
  ArrowUp: 1,
  ArrowRight: 1,
  ArrowDown: -1,
  ArrowLeft: -1,
  PageUp: 4,
  PageDown: -4
};
function inDial(event, dial) {
  const box = dial.getBoundingClientRect();
  return [
    (event.clientX - box.left) / box.width * 200,
    (event.clientY - box.top) / box.height * 200
  ];
}
function scaleOf(ctx, room, th) {
  return { ...scale(ctx), step: controlStatus(ctx, room, th).step };
}
function onRing(x2, y3) {
  const distance = Math.hypot(x2 - DIAL.cx, y3 - DIAL.cy);
  return distance >= DIAL.radius - RING.inside && distance <= DIAL.radius + RING.outside;
}
function dialHandlers(ctx, room, th) {
  const valueAt = (x2, y3) => dialValue(x2, y3, scaleOf(ctx, room, th));
  const move = (event) => ctx.store.control.drag && dragTo(ctx, room, { th, value: valueAt(...inDial(event, event.currentTarget)) });
  const down = (event) => {
    const [x2, y3] = inDial(event, event.currentTarget);
    if (event.button > 0 || !onRing(x2, y3)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragTo(ctx, room, { th, value: valueAt(x2, y3) });
  };
  return { down, move, ...endings(ctx), key: keyHandler(ctx, room, th) };
}
function sliderHandlers(ctx, room, th) {
  const valueAt = (event) => {
    const box = event.currentTarget.querySelector(".slider-bar").getBoundingClientRect();
    return sliderValue((event.clientX - box.left) / box.width, scaleOf(ctx, room, th));
  };
  const move = (event) => ctx.store.control.drag && dragTo(ctx, room, { th, value: valueAt(event) });
  const down = (event) => {
    if (event.button > 0 || !event.target.closest(".slider-bar")) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragTo(ctx, room, { th, value: valueAt(event) });
  };
  return { down, move, ...endings(ctx), key: keyHandler(ctx, room, th) };
}
function endings(ctx) {
  return {
    up: () => endDrag(ctx, { cancelled: false }),
    cancel: () => endDrag(ctx, { cancelled: true })
  };
}
function keyHandler(ctx, room, th) {
  return (event) => {
    const ends = { Home: scale(ctx).low, End: scale(ctx).high };
    if (!(event.key in KEY_STEPS) && !(event.key in ends)) return;
    event.preventDefault();
    if (event.key in ends)
      setTarget(ctx, room, { value: ends[event.key], th, delay: WRITE_DELAY.step });
    else stepTarget(ctx, room, { th, steps: KEY_STEPS[event.key] });
  };
}

// src/ui/views/dial.js
function at(angle, radius) {
  return dialPoint(angle, radius).map((value) => value.toFixed(2));
}
function angleOf(ctx, value) {
  return dialAngle(value, scale(ctx).low, scale(ctx).high);
}
function filled(ctx, value) {
  const angle = value != null ? angleOf(ctx, value) : null;
  if (angle == null || angle <= DIAL.start + 0.5) return A;
  const off = value <= OFF_T ? " off" : "";
  return w`<path d=${dialArc(DIAL.start, angle)} class="dial-fill${off}"/>`;
}
function handle(ctx, value) {
  if (value == null) return A;
  const [x2, y3] = at(angleOf(ctx, value), DIAL.radius);
  return w`<circle cx=${x2} cy=${y3} r="9" class="dial-handle${value <= OFF_T ? " off" : ""}"/>`;
}
function planDot(ctx, status) {
  if (!canReturnToPlan(status) || status.wanted == null) return A;
  const [x2, y3] = at(angleOf(ctx, status.wanted), DIAL.radius - 17);
  const title = `${texts(ctx).plan} ${formatTemp(status.wanted, formatting(ctx))}`;
  return w`<circle cx=${x2} cy=${y3} r="3" class="dial-plan"><title>${title}</title></circle>`;
}
function roomTick(ctx, status) {
  if (status.current == null) return A;
  const angle = angleOf(ctx, status.current);
  const [[x1, y1], [x2, y22]] = [at(angle, DIAL.radius - 9), at(angle, DIAL.radius + 9)];
  return w`<line x1=${x1} y1=${y1} x2=${x2} y2=${y22} class="dial-room"/>`;
}
function smallLines(ctx, status) {
  const text = texts(ctx);
  const temp = (value) => formatTemp(value, formatting(ctx));
  const room = status.current != null ? `${text.current} ${temp(Math.round(status.current * 10) / 10)}` : "";
  const differs = canReturnToPlan(status) && status.wanted != null;
  return { room, plan: differs ? `${text.plan} ${temp(status.wanted)}` : "" };
}
function middle(ctx, shown) {
  const { word, look, heats } = controlWord(ctx, shown.status, { named: false });
  const heat = heats ? w`<tspan class="heat"> · ${texts(ctx).heating}</tspan>` : A;
  const { room, plan: plan2 } = smallLines(ctx, shown.status);
  const status = w`<text x="100" y="72" class="dial-status ${look}">${word}${heat}</text>`;
  return w`${status}${bigValue(ctx, shown)}
    <text x="100" y="140" class="dial-small">${room}</text>
    ${plan2 ? w`<text x="100" y="156" class="dial-small">${plan2}</text>` : A}`;
}
function bigValue(ctx, { value, mixed: mixed2 }) {
  if (value == null) {
    const [y3, look] = mixed2 ? [110, "mixed"] : [116, ""];
    return w`<text x="100" y=${y3} class="dial-value ${look}">${mixed2 || "\u2013"}</text>`;
  }
  if (value <= OFF_T)
    return w`<text x="100" y="112" class="dial-value off">${texts(ctx).off}</text>`;
  const unit = w`<tspan class="dial-unit" dy="-17">°C</tspan>`;
  const number = formatNumber(value, formatting(ctx));
  return w`<text x="100" y="116" class="dial-value">${number}${unit}</text>`;
}
function valueText(ctx, { value, mixed: mixed2 }) {
  if (value == null) return mixed2 || "\u2013";
  return value <= OFF_T ? texts(ctx).off : formatTemp(value, formatting(ctx));
}
function dialSvg(ctx, room, shown) {
  const on = dialHandlers(ctx, room, shown.th);
  const label = shown.status.label || texts(ctx).setpoint;
  const ring = w`<path d=${dialArc(DIAL.start, DIAL.start + DIAL.sweep)} class="dial-track"/>`;
  const { status, value } = shown;
  const marks = w`${filled(ctx, value)}${planDot(ctx, status)}${roomTick(ctx, status)}
    ${handle(ctx, value)}`;
  return b2`<svg viewBox="0 0 200 200" tabindex="0" role="slider" aria-label=${label}
    aria-valuemin=${scale(ctx).low} aria-valuemax=${scale(ctx).high}
    aria-valuenow=${shown.value ?? A} aria-valuetext=${valueText(ctx, shown)}
    @pointerdown=${on.down} @pointermove=${on.move} @pointerup=${on.up} @pointercancel=${on.cancel}
    @keydown=${on.key}>${ring}${marks}${middle(ctx, shown)}</svg>`;
}
function dialView(ctx, room, shown) {
  const text = texts(ctx);
  const step = (steps) => () => stepTarget(ctx, room, { th: shown.th, steps });
  return b2`<div class="dial-box">${dialSvg(ctx, room, shown)}
    <div class="dial-buttons">
      <button class="round" aria-label=${text.colder} @click=${step(-1)}>−</button>
      <button class="round" aria-label=${text.warmer} @click=${step(1)}>+</button>
    </div>
  </div>`;
}

// src/ui/views/slider.js
function mark(ctx, kind, value) {
  if (value == null) return A;
  const percent = sliderPercent(value, scale(ctx));
  const off = value <= OFF_T && ["slider-fill", "slider-knob"].includes(kind) ? " off" : "";
  const style = kind === "slider-fill" ? `width:${percent}%` : `left:${percent}%`;
  return b2`<div class="${kind}${off}" style=${style}></div>`;
}
function sliderTop(ctx, { status, value }) {
  const { word, look, heats } = controlWord(ctx, status, { named: true });
  const heat = heats ? b2` <span class="heat">· ${texts(ctx).heating}</span>` : A;
  const { room, plan: plan2 } = smallLines(ctx, status);
  const off = value != null && value <= OFF_T ? "off" : "";
  return b2`<div class="slider-top">
    <span class="slider-value ${off}">${valueText(ctx, { value })}</span>
    <span class="slider-status ${look}">${word}${heat}</span><span class="grow"></span>
    <span class="dim small">${[room, plan2].filter(Boolean).join(" \xB7 ")}</span>
  </div>`;
}
function sliderBar(ctx, { status, value }) {
  const plan2 = smallLines(ctx, status).plan ? status.wanted : null;
  return b2`<div class="slider-bar"><div class="slider-track"></div>
    ${mark(ctx, "slider-fill", value)}${mark(ctx, "slider-plan", plan2)}
    ${mark(ctx, "slider-room", status.current)}${mark(ctx, "slider-knob", value)}</div>`;
}
function sliderView(ctx, room, shown) {
  const on = sliderHandlers(ctx, room, shown.th);
  const { low, high } = scale(ctx);
  const end = (value) => b2`<span>${formatTemp(value, formatting(ctx))}</span>`;
  const label = shown.status.label || texts(ctx).setpoint;
  return b2`<div class="slider ${shown.framed ? "framed" : ""}" tabindex="0" role="slider"
    aria-label=${label} aria-valuemin=${low} aria-valuemax=${high}
    aria-valuenow=${shown.value ?? A} aria-valuetext=${valueText(ctx, shown)}
    @pointerdown=${on.down} @pointermove=${on.move} @pointerup=${on.up} @pointercancel=${on.cancel}
    @keydown=${on.key}>${sliderTop(ctx, shown)}${sliderBar(ctx, shown)}
    <div class="slider-scale">${end(low)}${end(high)}</div>
  </div>`;
}

// src/ui/views/control.js
function statusOfThermostat(ctx, room, { status, th }) {
  return thermostatStatus(room, th, { status, states: ctx.gateway.states });
}
function selector(ctx, room, { status, selected }) {
  const choice = (th) => {
    const name = th ? statusOfThermostat(ctx, room, { status, th }).label : texts(ctx).all_th;
    const value = th ? choiceValue(ctx, room, { status, th }) : A;
    return b2`<button class=${th === selected ? "on" : ""} aria-pressed=${th === selected}
      title=${name} @click=${() => selectThermostat(ctx, room.id, th)}>
      <span class="name">${name}</span>${value}</button>`;
  };
  return b2`<div class="thermostats" role="group" aria-label=${texts(ctx).pick_th}>
    ${["", ...room.thermostats].map(choice)}</div>`;
}
function choiceValue(ctx, room, of) {
  const value = shownValue(ctx, room, of.th);
  if (typeof value !== "number") return A;
  const manual = statusOfThermostat(ctx, room, of).manual;
  const number = formatNumber(value, formatting(ctx));
  return b2`<span class=${manual ? "manual" : "dim"}>${number}°</span>`;
}
function dialLayout(ctx, room, status) {
  const several = room.thermostats.length > 1;
  const chosen = ctx.store.ui.thermostat[room.id];
  const selected = several && room.thermostats.includes(chosen) ? chosen : "";
  const { pending, drag } = ctx.store.control;
  const setting = [pending, drag].some((item) => item?.room === room.id && item.th === "");
  const values = !selected && !setting ? mixed(ctx, room) : null;
  const shown = {
    status: selected ? statusOfThermostat(ctx, room, { status, th: selected }) : status,
    value: values ? null : shownValue(ctx, room, selected),
    mixed: values ? targetsText(values, formatting(ctx)) : void 0
  };
  const choices = several ? selector(ctx, room, { status, selected }) : A;
  return b2`${choices}${dialView(ctx, room, { ...shown, th: selected })}`;
}
function compactLayout(ctx, room, status) {
  if (room.thermostats.length < 2) {
    return sliderView(ctx, room, { status, value: shownValue(ctx, room, ""), th: "" });
  }
  const slider = (th) => {
    const own = statusOfThermostat(ctx, room, { status, th });
    return sliderView(ctx, room, {
      status: own,
      value: shownValue(ctx, room, th),
      th,
      framed: true
    });
  };
  return b2`${room.thermostats.map(slider)}${allTogether(ctx, room)}`;
}
function allTogether(ctx, room) {
  const text = texts(ctx);
  const button2 = (steps, word) => b2`<button class="round" aria-label=${`${text.both_th}: ${word}`}
    @click=${() => shiftAll(ctx, room, steps)}>${steps < 0 ? "\u2212" : "+"}</button>`;
  return b2`<div class="all-row">
    <span><span class="block">${text.both_th}</span>
      <span class="block dim small">${text.both_help}</span></span>
    <span class="grow"></span>${button2(-1, text.colder)}${button2(1, text.warmer)}
  </div>`;
}
function periodPill(ctx, room, status) {
  if (!status.at) return A;
  const text = texts(ctx);
  const { period, next } = status.at;
  const show = (item) => formatPeriod(item, formatting(ctx), text);
  const until = next ? `${text.until} ${formatTime(next.start, formatting(ctx))}` : `${text.until} ${text.tomorrow_l}`;
  const now2 = `${planName(ctx, room, status.plan)}: ${show(period)} ${until}`;
  const then = next ? b2`<span class="dim">${text.then} ${show(next)}</span>` : A;
  return b2`<div class="pill"><span>${now2}</span>${then}</div>`;
}
function thermostatList(ctx, room, status) {
  const row = (th) => {
    const state = ctx.gateway.states[th];
    if (!state) return b2`<div class="thermostat dim">${th}</div>`;
    const each = statusOfThermostat(ctx, room, { status, th });
    const value = setpointText(ctx, state, each);
    const setpoint = b2`<span class=${each.manual ? "manual" : ""}>${value}</span>`;
    const current = formatTemp(state.attributes.current_temperature, formatting(ctx));
    return b2`<div class="thermostat"><span>${each.label}</span>
      <span class="dim">${current} → ${setpoint}</span></div>`;
  };
  return room.thermostats.map(row);
}
function setpointText(ctx, state, each) {
  const text = texts(ctx);
  if (UNAVAILABLE.includes(state.state)) return text.unavailable;
  return state.state === "off" ? text.off : formatTemp(each.target, formatting(ctx));
}
function backRow(ctx, room, status) {
  if (!canReturnToPlan(status) || status.wanted == null) return A;
  const text = texts(ctx);
  const next = status.at?.next;
  const holds2 = next ? `${text.manual_until} ${formatTime(next.start, formatting(ctx))}${text.manual_then}` : "";
  return b2`<div class="back-row"><span class="dim small grow">${holds2}</span>
    <button class="btn flat small outline" @click=${() => backToPlan(ctx, room)}>
      ${text.to_plan}</button></div>`;
}
function controlView(ctx, room, status) {
  const text = texts(ctx);
  const dial = ctx.store.ui.layout === "dial";
  const list = dial && room.thermostats.length > 1 ? thermostatList(ctx, room, status) : A;
  const layout = dial ? dialLayout(ctx, room, status) : compactLayout(ctx, room, status);
  return b2`${layout}${periodPill(ctx, room, status)}${list}${backRow(ctx, room, status)}
    <div class="foot"><button class="link small" @click=${() => toggleLayout(ctx)}>
      ${dial ? text.layout_compact : text.layout_dial}</button></div>`;
}

// src/state/drafts.js
function copy(value) {
  return structuredClone(value);
}
function savedPlan(ctx, room, entity) {
  const periods = ctx.store.data.plans[entity]?.periods || [];
  return { name: planName(ctx, room, entity), periods: copy(periods) };
}
function planDraft(ctx, room, entity) {
  return ctx.store.drafts.plans[entity] || savedPlan(ctx, room, entity);
}
function isPlanDirty(ctx, room, entity) {
  const draft = ctx.store.drafts.plans[entity];
  if (!draft) return false;
  const saved = savedPlan(ctx, room, entity);
  const shape = (periods) => JSON.stringify(
    periods.map((period) => [period.start, period.off ? "off" : period.temperature])
  );
  return draft.name !== saved.name || shape(draft.periods) !== shape(saved.periods);
}
function editPlan(ctx, { room, entity }, change) {
  ctx.store.update((store) => {
    store.drafts.plans[entity] ||= savedPlan(ctx, room, entity);
    change(store.drafts.plans[entity]);
  });
}
function weekDraft(ctx, room) {
  return ctx.store.drafts.weeks[room.id] || { week: { ...room.week }, free_day: room.free_day };
}
function isWeekDirty(ctx, room) {
  const draft = ctx.store.drafts.weeks[room.id];
  if (!draft) return false;
  const planOn = (week, day) => week[day] || room.plans[0];
  const changed = WEEK.some((day) => planOn(draft.week, day) !== planOn(room.week, day));
  return changed || draft.free_day !== room.free_day;
}
function editWeek(ctx, room, change) {
  ctx.store.update((store) => {
    store.drafts.weeks[room.id] ||= copy(weekDraft(ctx, room));
    change(store.drafts.weeks[room.id]);
  });
}
function setupDraft(ctx, room) {
  const saved = {
    name: room.name,
    thermostats: [...room.thermostats],
    windows: [...room.windows || []],
    window_delay: room.window_delay ?? LIMITS.window_delay.initial,
    room_sensor: room.room_sensor || "",
    room_margin: room.room_margin ?? LIMITS.room_margin.initial
  };
  return ctx.store.drafts.setups[room.id] || saved;
}
function editSetup(ctx, room, change) {
  ctx.store.update((store) => {
    store.drafts.setups[room.id] ||= copy(setupDraft(ctx, room));
    change(store.drafts.setups[room.id]);
  });
}
function editableRules(rules) {
  const rule = (item) => typeof item === "string" ? { keyword: item } : item;
  return rules.map(rule).map((item) => ({ keyword: item.keyword || "", plan: item.plan || "" }));
}
function settingsDraft(ctx) {
  if (ctx.store.drafts.settings) return ctx.store.drafts.settings;
  const input = ctx.store.data.script?.use_blueprint?.input || {};
  return {
    calendars: [...asList(input.calendars)],
    rules: editableRules(input.rules || []),
    workday: input.workday || "",
    exceptions: input.exceptions || "",
    holidays: input.holidays || ""
  };
}
function editSettings(ctx, change) {
  ctx.store.update((store) => {
    store.drafts.settings ||= copy(settingsDraft(ctx));
    change(store.drafts.settings);
  });
}
function exerciseDraft(ctx) {
  return ctx.store.drafts.exercise || exerciseSettings(ctx);
}
function editExercise(ctx, change) {
  ctx.store.update((store) => {
    store.drafts.exercise ||= copy(exerciseDraft(ctx));
    change(store.drafts.exercise);
  });
}

// src/state/actions/plan-editor.js
function togglePeriod(ctx, { room, entity }, index) {
  ctx.store.update(({ ui }) => {
    const same = ui.period?.room === room.id && ui.period.plan === entity && ui.period.index === index;
    ui.period = same ? null : { room: room.id, plan: entity, index };
  });
}
function stepPeriod(ctx, plan2, { index, steps }) {
  editPlan(ctx, plan2, (draft) => {
    const period = draft.periods[index];
    const value = (period.temperature ?? NEW_PERIOD_T) + steps * PLAN_STEP;
    period.temperature = snap(value, { low: MIN_T, high: MAX_T, step: PLAN_STEP });
  });
}
function setPeriodStart(ctx, plan2, { index, start }) {
  editPlan(ctx, plan2, (draft) => draft.periods[index].start = start);
}
function setPeriodOff(ctx, plan2, { index, off }) {
  editPlan(ctx, plan2, (draft) => {
    const period = draft.periods[index];
    period.off = off;
    if (!off && (period.temperature == null || period.temperature === OFF_T))
      period.temperature = ON_AGAIN_T;
  });
}
function addPeriod(ctx, plan2) {
  const periods = planDraft(ctx, plan2.room, plan2.entity).periods;
  const last = periods[periods.length - 1];
  const start = Math.min(DAY_MINUTES - 1, (last ? last.start : 0) + 60);
  if (last && start <= last.start) return;
  const temperature = last && !last.off ? periodTemp(last) : NEW_PERIOD_T;
  editPlan(ctx, plan2, (draft) => draft.periods.push({ start, temperature, off: false }));
  ctx.store.update(
    ({ ui }) => ui.period = { room: plan2.room.id, plan: plan2.entity, index: periods.length }
  );
}
function deletePeriod(ctx, plan2, index) {
  editPlan(ctx, plan2, (draft) => draft.periods.splice(index, 1));
  ctx.store.update(({ ui }) => ui.period = null);
}
function renamePlan(ctx, plan2, name = null) {
  if (name == null) ctx.store.update(({ ui }) => ui.renaming = plan2.entity);
  else editPlan(ctx, plan2, (draft) => draft.name = name);
}
function resetPlan(ctx, { entity }) {
  ctx.store.update((store) => {
    delete store.drafts.plans[entity];
    Object.assign(store.ui, { period: null, renaming: null });
  });
}
async function storePlan(ctx, { room, entity }) {
  const draft = planDraft(ctx, room, entity);
  const [problem] = checkPeriods(draft.periods);
  if (problem) throw new CardError(problem, { min: MIN_T, max: MAX_T });
  const item = ctx.store.data.plans[entity].item;
  const renamed = draft.name && draft.name !== planName(ctx, room, entity);
  const name = renamed ? `${room.name} ${draft.name}` : item.name;
  const saved = await savePlan(ctx.gateway, item, { name, periods: draft.periods });
  ctx.store.update((store) => store.data.plans[entity] = saved);
}
function commitPlan(ctx, plan2) {
  return save(ctx, async () => {
    await storePlan(ctx, plan2);
    resetPlan(ctx, plan2);
    await poke(ctx, [plan2.room]);
  });
}
function removePlan(ctx, { room, entity }) {
  return save(ctx, async () => {
    if (entity === room.free_day || Object.values(room.week || {}).includes(entity))
      throw new CardError("plan_in_use");
    await commitRoom(ctx, room, { plans: room.plans.filter((plan2) => plan2 !== entity) });
    await deletePlan(ctx.gateway, ctx.store.data.plans[entity].item);
    ctx.store.update((store) => delete store.data.plans[entity]);
    resetPlan(ctx, { room, entity });
  });
}
function toggleAddPlan(ctx, room) {
  ctx.store.update(({ ui }) => {
    ui.addPlan = ui.addPlan?.room === room.id ? null : { room: room.id, name: "", template: "starter_weekday" };
  });
}
function setAddPlan(ctx, change) {
  ctx.store.update(({ ui }) => Object.assign(ui.addPlan, change));
}
function templatePeriods(ctx, template) {
  if (template === "starter_free") return STARTER.free;
  return ctx.store.data.plans[template]?.periods || STARTER.weekday;
}
function addPlan(ctx, room) {
  const { name, template } = ctx.store.ui.addPlan;
  if (!name.trim()) return Promise.resolve(false);
  return save(ctx, async () => {
    const periods = templatePeriods(ctx, template);
    const made = await createPlan(ctx.gateway, { room: room.name, name: name.trim(), periods });
    ctx.store.update((store) => store.data.plans[made.entity] = made.plan);
    await commitRoom(ctx, room, { plans: [...room.plans, made.entity] });
    ctx.store.update(
      ({ ui }) => Object.assign(ui, { addPlan: null, plan: { ...ui.plan, [room.id]: made.entity } })
    );
  });
}

// src/state/actions/confirm.js
var CONFIRM_MS = 5e3;
function confirmed(ctx, key, act) {
  clearTimeout(ctx.timers.confirm);
  if (ctx.store.ui.confirming === key) {
    ctx.store.update(({ ui }) => ui.confirming = null);
    return act();
  }
  ctx.store.update(({ ui }) => ui.confirming = key);
  const stop = () => ctx.store.ui.confirming === key && cancelConfirm(ctx);
  ctx.timers.confirm = setTimeout(stop, CONFIRM_MS);
  return void 0;
}
function cancelConfirm(ctx) {
  clearTimeout(ctx.timers.confirm);
  ctx.store.update(({ ui }) => ui.confirming = null);
}

// src/ui/views/chart.js
var RANGE = { low: 10, high: 26 };
function barHeight(period) {
  if (period.temperature == null && !period.off) return 0;
  if (period.off) return 16;
  const share = (period.temperature - RANGE.low) / (RANGE.high - RANGE.low);
  return 28 + 72 * Math.max(0, Math.min(1, share));
}
function bar(ctx, period, width) {
  const gap2 = period.temperature == null && !period.off;
  const value = period.off ? texts(ctx).off : formatNumber(period.temperature, formatting(ctx));
  const color = period.off || gap2 ? "" : `background:${tempColor(period.temperature)}`;
  const style = `height:${barHeight(period)}%;${color}`;
  return b2`<div class="chart-bar" style=${style}>${width > 6 && !gap2 ? value : ""}</div>`;
}
function segment(ctx, chart, index) {
  const period = chart.periods[index];
  const end = chart.periods[index + 1]?.start ?? DAY_MINUTES;
  const width = (end - period.start) / DAY_MINUTES * 100;
  const selected = chart.selected === index ? "selected" : "";
  const classes = `chart-segment ${period.off ? "off" : ""} ${selected}`;
  const style = `left:${period.start / DAY_MINUTES * 100}%;width:${width}%`;
  const inside = bar(ctx, period, width);
  if (!ctx.store.data.admin) return b2`<div class=${classes} style=${style}>${inside}</div>`;
  const format = formatting(ctx);
  const name = `${formatTime(period.start, format)} ${formatPeriod(period, format, texts(ctx))}`;
  return b2`<button class=${classes} style=${style} aria-label=${name}
    @click=${() => togglePeriod(ctx, chart.plan, index)}>${inside}</button>`;
}
function chartView(ctx, chart) {
  const now2 = chart.now != null ? b2`<div class="chart-now" style="left:${chart.now / DAY_MINUTES * 100}%"></div>` : A;
  const ticks = [0, 6, 12, 18, 24].map((hour) => b2`<span>${hour}</span>`);
  return b2`<div class="chart">${chart.periods.map((_2, i6) => segment(ctx, chart, i6))}${now2}</div>
    <div class="chart-ticks">${ticks}</div>`;
}

// src/ui/views/plan-periods.js
function periodRow(ctx, list, index) {
  const period = list.periods[index];
  const now2 = list.current === period.start ? "current" : "";
  const format = formatting(ctx);
  const inside = b2`<span>${formatTime(period.start, format)}</span><span class="grow"></span>
    <span>${formatPeriod(period, format, texts(ctx))}</span>`;
  if (!ctx.store.data.admin) return b2`<div class="period-row ${now2}">${inside}</div>`;
  return b2`<button class="period-row ${now2}" @click=${() => togglePeriod(ctx, list.plan, index)}>
    ${inside}</button>`;
}
function temperatureStepper(ctx, list, index) {
  const text = texts(ctx);
  const period = list.periods[index];
  const button2 = (steps, word) => b2`<button class="round small" ?disabled=${period.off}
    aria-label=${word} @click=${() => stepPeriod(ctx, list.plan, { index, steps })}>
    ${steps < 0 ? "\u2212" : "+"}</button>`;
  const value = period.off ? text.off : formatPeriod(period, formatting(ctx), text);
  return b2`<div class="temperature-step">
    ${button2(-1, text.colder)}<span>${value}</span>${button2(1, text.warmer)}</div>`;
}
function startField(ctx, list, index) {
  const change = (event) => {
    const start = event.target.value ? toMin(event.target.value) : 0;
    setPeriodStart(ctx, list.plan, { index, start });
  };
  return b2`<input type="time" step="60" aria-label=${texts(ctx).from}
    .value=${fromMin(list.periods[index].start)} ?disabled=${index === 0} @change=${change}>`;
}
function periodEditor(ctx, list, index) {
  const text = texts(ctx);
  const off = (event) => setPeriodOff(ctx, list.plan, { index, off: event.target.checked });
  const remove = b2`<button class="icon" title=${text.delete} aria-label=${text.delete}
    @click=${() => deletePeriod(ctx, list.plan, index)}>
    <ha-icon icon="mdi:delete-outline"></ha-icon></button>`;
  return b2`<div class="period-edit">${startField(ctx, list, index)}
    ${temperatureStepper(ctx, list, index)}
    <label class="check"><input type="checkbox" .checked=${list.periods[index].off}
      @change=${off}> ${text.off}</label>
    ${index === 0 ? b2`<span></span>` : remove}</div>`;
}
function periodList(ctx, list) {
  const admin = ctx.store.data.admin;
  const row = (_2, i6) => admin && list.editing === i6 ? periodEditor(ctx, list, i6) : periodRow(ctx, list, i6);
  return b2`<div class="period-list">${list.periods.map(row)}</div>`;
}

// src/ui/views/plan.js
function shownPlan(ctx, room, status) {
  const plans = room.plans.filter((plan2) => ctx.store.data.plans[plan2]);
  const chosen = ctx.store.ui.plan[room.id];
  if (plans.includes(chosen)) return chosen;
  return plans.includes(status.plan) ? status.plan : plans[0];
}
function planChips(ctx, room, { shown, today: today2 }) {
  const adding = ctx.store.ui.addPlan?.room === room.id;
  const chip = (plan2) => {
    const on = plan2 === shown && !adding ? "on" : "";
    const dirty = isPlanDirty(ctx, room, plan2) ? "dirty" : "";
    const name = `${planDraft(ctx, room, plan2).name}${plan2 === today2 ? " \u2022" : ""}`;
    return button(name, () => selectPlan(ctx, room.id, plan2), { kind: `pick ${on} ${dirty}` });
  };
  const kind = `pick add ${adding ? "on" : ""}`;
  const add = button("+", () => toggleAddPlan(ctx, room), { kind, aria: texts(ctx).add_plan });
  const plans = room.plans.filter((plan2) => ctx.store.data.plans[plan2]);
  return b2`<div class="picks">${plans.map(chip)}${ctx.store.data.admin ? add : A}</div>`;
}
function templates(ctx) {
  const text = texts(ctx);
  const named = (room) => (plan2) => [plan2, `${room.name}: ${planName(ctx, room, plan2)}`];
  const loaded = (room) => room.plans.filter((plan2) => ctx.store.data.plans[plan2]);
  const copies = ctx.store.data.allRooms.flatMap((room) => loaded(room).map(named(room)));
  return [
    ["starter_weekday", text.starter_weekday],
    ["starter_free", text.starter_free],
    ...copies
  ];
}
function addPlanForm(ctx, room) {
  const text = texts(ctx);
  const form = ctx.store.ui.addPlan;
  const onChange = (value) => setAddPlan(ctx, { template: value });
  const cancel = button(text.cancel, () => toggleAddPlan(ctx, room), { kind: "btn flat small" });
  return b2`<div class="panel">
    ${textField(text.name, form.name, (value) => setAddPlan(ctx, { name: value }))}
    ${selectField(text.copy_from, { list: templates(ctx), selected: form.template, onChange })}
    ${actionRow(
    cancel,
    button(text.create, () => addPlan(ctx, room))
  )}
  </div>`;
}
function usedOn(ctx, room, plan2) {
  const text = texts(ctx);
  const days = WEEK.filter((day) => room.week[day] === plan2).map((day) => text.wd_short[day]);
  const uses = [
    ...days.length ? [days.join(" ")] : [],
    ...plan2 === room.free_day ? [text.free_days] : []
  ];
  return uses.length ? `${text.used_on}: ${uses.join(" \xB7 ")}` : text.not_used;
}
function planActions(ctx, plan2) {
  const text = texts(ctx);
  const renaming = ctx.store.ui.renaming === plan2.entity;
  const rename = button(text.rename, () => renamePlan(ctx, plan2), { kind: "link small" });
  return b2`<div class="actions">
      ${button(`+ ${text.add_period}`, () => addPeriod(ctx, plan2), { kind: "btn flat small" })}
      <span class="grow"></span>${renaming ? A : rename}${deleteButton(ctx, plan2)}</div>
    ${renaming ? nameField(ctx, plan2) : A}${planSaveBar(ctx, plan2)}`;
}
function deleteButton(ctx, plan2) {
  const text = texts(ctx);
  const key = `delete:${plan2.entity}`;
  const asking = ctx.store.ui.confirming === key;
  const remove = () => confirmed(ctx, key, () => removePlan(ctx, plan2));
  const label = asking ? text.really_delete : text.delete;
  return button(label, remove, { kind: `link small ${asking ? "asking" : ""}` });
}
function nameField(ctx, plan2) {
  const name = planDraft(ctx, plan2.room, plan2.entity).name;
  return textField(texts(ctx).name, name, (value) => renamePlan(ctx, plan2, value));
}
function planSaveBar(ctx, plan2) {
  const text = texts(ctx);
  const errors = checkPeriods(planDraft(ctx, plan2.room, plan2.entity).periods);
  const why = errors.map((code) => fill(text[`err_${code}`], { min: MIN_T, max: MAX_T })).join(" ");
  const actions = {
    cancel: () => resetPlan(ctx, plan2),
    save: () => commitPlan(ctx, plan2),
    disabled: errors.length > 0
  };
  const dirty = isPlanDirty(ctx, plan2.room, plan2.entity);
  const bar2 = dirty ? saveBar([text.unsaved, text.cancel, text.save], actions) : A;
  return b2`${why ? b2`<div class="error">${why}</div>` : A}${bar2}`;
}
function planDetail(ctx, plan2, status) {
  const periods = planDraft(ctx, plan2.room, plan2.entity).periods;
  const perDay = isPerDay(ctx, plan2);
  const { minute, current } = markedNow(ctx, plan2, status);
  const edit = ctx.store.ui.period;
  const editing = edit?.room === plan2.room.id && edit.plan === plan2.entity ? edit.index : null;
  return b2`<div class="pinfo dim small">${usedOn(ctx, plan2.room, plan2.entity)}</div>
    ${perDay ? b2`<div class="banner warn small">${texts(ctx).plan_per_day}</div>` : A}
    ${chartView(ctx, { plan: plan2, periods, now: minute, selected: editing })}
    ${periodList(ctx, { plan: plan2, periods, current, editing })}
    ${ctx.store.data.admin ? planActions(ctx, plan2) : A}`;
}
function isPerDay(ctx, plan2) {
  return Boolean(ctx.store.data.plans[plan2.entity]?.perDay);
}
function markedNow(ctx, plan2, status) {
  if (plan2.entity !== status.plan || isPerDay(ctx, plan2)) return { minute: null, current: null };
  return { minute: now(ctx).min, current: status.at ? status.at.period.start : null };
}
function planView(ctx, room, status) {
  const shown = shownPlan(ctx, room, status);
  const chips = planChips(ctx, room, { shown, today: status.plan });
  if (ctx.store.ui.addPlan?.room === room.id) return b2`${chips}${addPlanForm(ctx, room)}`;
  if (!shown) return chips;
  return b2`${chips}${planDetail(ctx, { room, entity: shown }, status)}`;
}

// src/state/actions/room-setup.js
function togglePicker(ctx, { room, kind }) {
  ctx.store.update(({ ui }) => {
    const same = ui.picker?.room === room && ui.picker.kind === kind;
    ui.picker = same ? null : { room, kind, query: "" };
  });
}
function searchEntities(ctx, picker) {
  ctx.store.update(({ ui }) => ui.picker = { ...picker });
}
function pick(ctx, room, { kind, entity }) {
  if (!room) {
    ctx.store.update(
      ({ ui }) => ui.addRoom.thermostats = [.../* @__PURE__ */ new Set([...ui.addRoom.thermostats, entity])]
    );
  } else {
    editSetup(ctx, room, (draft) => {
      if (kind === "rs") draft.room_sensor = entity;
      else if (kind === "th") draft.thermostats = [.../* @__PURE__ */ new Set([...draft.thermostats, entity])];
      else draft.windows = [.../* @__PURE__ */ new Set([...draft.windows, entity])];
    });
  }
  ctx.store.update(({ ui }) => ui.picker = null);
}
function unpick(ctx, room, { kind, entity }) {
  const without = (list) => list.filter((item) => item !== entity);
  if (!room) {
    ctx.store.update(({ ui }) => ui.addRoom.thermostats = without(ui.addRoom.thermostats));
    return;
  }
  editSetup(ctx, room, (draft) => {
    if (kind === "rs") draft.room_sensor = "";
    else if (kind === "th") draft.thermostats = without(draft.thermostats);
    else draft.windows = without(draft.windows);
  });
}
function marginOf(value) {
  const { min, max, initial } = LIMITS.room_margin;
  const typed = Number(String(value).replace(",", ".")) || initial;
  return clamp(Math.round(typed * 10) / 10, min, max);
}
function stepMargin(ctx, room, steps) {
  editSetup(ctx, room, (draft) => {
    draft.room_margin = marginOf(marginOf(draft.room_margin) + steps * LIMITS.room_margin.step);
  });
}
function setSetup(ctx, room, change) {
  editSetup(ctx, room, (draft) => Object.assign(draft, change));
}
function setupInput(draft) {
  const { min, max } = LIMITS.window_delay;
  return {
    room_name: draft.name.trim(),
    thermostats: draft.thermostats,
    windows: draft.windows,
    window_delay: clamp(Math.round(Number(draft.window_delay) || 0), min, max),
    room_sensor: draft.room_sensor || [],
    room_margin: marginOf(draft.room_margin)
  };
}
function commitSetup(ctx, room) {
  const draft = setupDraft(ctx, room);
  if (!draft.name.trim() || !draft.thermostats.length) return Promise.resolve(false);
  return save(ctx, async () => {
    const saved = await commitRoom(ctx, room, setupInput(draft));
    ctx.store.update((store) => delete store.drafts.setups[room.id]);
    await poke(ctx, [saved]);
  });
}

// ../../../node_modules/lit-html/directive-helpers.js
var { I: t3 } = j;
var r4 = (o7) => void 0 === o7.strings;

// ../../../node_modules/lit-html/directive.js
var t4 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
var e4 = (t5) => (...e5) => ({ _$litDirective$: t5, values: e5 });
var i5 = class {
  constructor(t5) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t5, e5, i6) {
    this._$Ct = t5, this._$AM = e5, this._$Ci = i6;
  }
  _$AS(t5, e5) {
    return this.update(t5, e5);
  }
  update(t5, e5) {
    return this.render(...e5);
  }
};

// ../../../node_modules/lit-html/async-directive.js
var s4 = (i6, t5) => {
  const e5 = i6._$AN;
  if (void 0 === e5) return false;
  for (const i7 of e5) i7._$AO?.(t5, false), s4(i7, t5);
  return true;
};
var o5 = (i6) => {
  let t5, e5;
  do {
    if (void 0 === (t5 = i6._$AM)) break;
    e5 = t5._$AN, e5.delete(i6), i6 = t5;
  } while (0 === e5?.size);
};
var r5 = (i6) => {
  for (let t5; t5 = i6._$AM; i6 = t5) {
    let e5 = t5._$AN;
    if (void 0 === e5) t5._$AN = e5 = /* @__PURE__ */ new Set();
    else if (e5.has(i6)) break;
    e5.add(i6), c4(t5);
  }
};
function h3(i6) {
  void 0 !== this._$AN ? (o5(this), this._$AM = i6, r5(this)) : this._$AM = i6;
}
function n4(i6, t5 = false, e5 = 0) {
  const r6 = this._$AH, h4 = this._$AN;
  if (void 0 !== h4 && 0 !== h4.size) if (t5) if (Array.isArray(r6)) for (let i7 = e5; i7 < r6.length; i7++) s4(r6[i7], false), o5(r6[i7]);
  else null != r6 && (s4(r6, false), o5(r6));
  else s4(this, i6);
}
var c4 = (i6) => {
  i6.type == t4.CHILD && (i6._$AP ??= n4, i6._$AQ ??= h3);
};
var f3 = class extends i5 {
  constructor() {
    super(...arguments), this._$AN = void 0;
  }
  _$AT(i6, t5, e5) {
    super._$AT(i6, t5, e5), r5(this), this.isConnected = i6._$AU;
  }
  _$AO(i6, t5 = true) {
    i6 !== this.isConnected && (this.isConnected = i6, i6 ? this.reconnected?.() : this.disconnected?.()), t5 && (s4(this, i6), o5(this));
  }
  setValue(t5) {
    if (r4(this._$Ct)) this._$Ct._$AI(t5, this);
    else {
      const i6 = [...this._$Ct._$AH];
      i6[this._$Ci] = t5, this._$Ct._$AI(i6, this, 0);
    }
  }
  disconnected() {
  }
  reconnected() {
  }
};

// ../../../node_modules/lit-html/directives/ref.js
var o6 = /* @__PURE__ */ new WeakMap();
var n5 = e4(class extends f3 {
  render(i6) {
    return A;
  }
  update(i6, [s5]) {
    const e5 = s5 !== this.G;
    return e5 && this.rt(void 0), (e5 || this.lt !== this.ct) && (this.G = s5, this.ht = i6.options?.host, this.rt(this.ct = i6.element)), A;
  }
  rt(t5) {
    if (void 0 !== this.G) if (this.isConnected || (t5 = void 0), "function" == typeof this.G) {
      const i6 = this.ht ?? globalThis;
      let s5 = o6.get(i6);
      void 0 === s5 && (s5 = /* @__PURE__ */ new WeakMap(), o6.set(i6, s5)), void 0 !== s5.get(this.G) && this.G.call(this.ht, void 0), s5.set(this.G, t5), void 0 !== t5 && this.G.call(this.ht, t5);
    } else this.G.value = t5;
  }
  get lt() {
    return "function" == typeof this.G ? o6.get(this.ht ?? globalThis)?.get(this.G) : this.G?.value;
  }
  disconnected() {
    this.lt === this.ct && this.rt(void 0);
  }
  reconnected() {
    this.rt(this.ct);
  }
});

// src/domain/picker.js
function pickKind(state, kind) {
  const id = state.entity_id;
  const deviceClass = state.attributes?.device_class;
  const fits = {
    th: () => id.startsWith("climate."),
    win: () => id.startsWith("binary_sensor.") && WINDOW_CLASSES.includes(deviceClass),
    rs: () => id.startsWith("sensor.") && deviceClass === "temperature"
  };
  return Boolean(fits[kind]?.());
}
function pickCandidates(states, { kind, query = "", exclude = [], areaOf: areaOf2 = () => "", roomArea = "" }) {
  const words = String(query).toLowerCase().split(/\s+/).filter(Boolean);
  const name = (state) => String(state.attributes?.friendly_name || state.entity_id);
  const text = (state) => `${name(state)} ${state.entity_id} ${areaOf2(state.entity_id) || ""}`;
  const list = states.filter((state) => pickKind(state, kind) && !exclude.includes(state.entity_id)).filter((state) => words.every((word) => text(state).toLowerCase().includes(word))).sort((a3, b3) => name(a3).localeCompare(name(b3)));
  const here = roomArea ? list.filter((state) => areaOf2(state.entity_id) === roomArea) : [];
  return { here, other: list.filter((state) => !here.includes(state)) };
}

// src/ui/views/picker.js
var SHOWN = 8;
var focused = /* @__PURE__ */ new WeakSet();
function focusOnce(field) {
  if (!field || focused.has(field)) return;
  focused.add(field);
  field.focus();
}
function temperatureOf(ctx, kind, state) {
  const value = kind === "rs" ? Number(state.state) : state.attributes.current_temperature;
  if (kind === "win" || typeof value !== "number" || Number.isNaN(value)) return A;
  return b2` <span class="dim">· ${formatTemp(value, formatting(ctx))}</span>`;
}
function found(ctx, picker, state) {
  const id = state.entity_id;
  const area = areaOf(ctx, id);
  const choose = () => pick(ctx, picker.room, { kind: picker.kind, entity: id });
  const name = state.attributes.friendly_name || id;
  return b2`<button class="picker-item" @click=${choose}>
    <span class="block">${name}${temperatureOf(ctx, picker.kind, state)}</span>
    <span class="block dim small ellipsis">${id}${area ? ` \xB7 ${area}` : ""}</span></button>`;
}
function foundGroup(ctx, picker, { title, list }) {
  if (!list.length) return A;
  const rest = list.length - SHOWN;
  const more = rest > 0 ? b2`<div class="picker-group">${rest} ${texts(ctx).more_matches}</div>` : A;
  const items = list.slice(0, SHOWN).map((state) => found(ctx, picker, state));
  return b2`<div class="picker-group">${title}</div>${items}${more}`;
}
function results(ctx, picker, query) {
  const text = texts(ctx);
  const where = { roomArea: picker.area, areaOf: (entity) => areaOf(ctx, entity) };
  const search = { kind: picker.kind, query, exclude: picker.exclude, ...where };
  const { here, other } = pickCandidates(Object.values(ctx.gateway.states), search);
  if (!here.length && !other.length) return b2`<div class="picker-group">${text.no_match}</div>`;
  const local = { title: picker.area ? `${text.in_area} ${picker.area}` : "", list: here };
  const elsewhere = { title: here.length ? text.other_areas : "", list: other };
  return b2`${foundGroup(ctx, picker, local)}${foundGroup(ctx, picker, elsewhere)}`;
}
function pickerView(ctx, picker) {
  const text = texts(ctx);
  const id = picker.room?.id ?? "";
  const open = ctx.store.ui.picker;
  const query = open?.room === id && open.kind === picker.kind ? open.query : "";
  const type = (event) => searchEntities(ctx, { room: id, kind: picker.kind, query: event.target.value });
  return b2`<div class="picker"><label class="search"><ha-icon icon="mdi:magnify"></ha-icon>
      <input ${n5(focusOnce)} .value=${query} placeholder=${text.search} aria-label=${text.search}
        autocomplete="off" @input=${type}></label>
    <div class="picker-list">${results(ctx, picker, query)}</div></div>`;
}

// src/ui/views/room-setup.js
function nameOf(ctx, entity) {
  return ctx.gateway.states[entity]?.attributes.friendly_name || entity;
}
function section(ctx, { key, title, summary, body }) {
  const open = ctx.store.ui.setupPart === key;
  const chevron = open ? "mdi:chevron-up" : "mdi:chevron-down";
  const toggle = () => toggleSetupPart(ctx, key);
  const brief = open ? A : b2`<span class="dim small ellipsis">${summary}</span>`;
  return b2`<div class="section ${open ? "open" : ""}">
    <button class="section-head plain" aria-expanded=${open} @click=${toggle}>
      <span class="section-title">${title}</span><span class="grow"></span>${brief}
      <ha-icon class="chevron" icon=${chevron}></ha-icon></button>
    ${open ? b2`<div class="section-body">${body()}</div>` : A}</div>`;
}
function entityChip(ctx, room, { kind, entity }) {
  const name = nameOf(ctx, entity);
  const remove = () => unpick(ctx, room, { kind, entity });
  return b2`<span class="entity-chip">${name}<button class="x"
    aria-label=${`${texts(ctx).remove}: ${name}`} @click=${remove}>✕</button></span>`;
}
function entityChips(ctx, room, { kind, list }) {
  const id = room?.id ?? "";
  const picker = ctx.store.ui.picker;
  const area = areaOf(ctx, list[0] || room?.thermostats[0] || "");
  const open = picker?.room === id && picker.kind === kind;
  const search = open ? pickerView(ctx, { room, kind, exclude: list, area }) : A;
  const add = () => togglePicker(ctx, { room: id, kind });
  const chips = list.map((entity) => entityChip(ctx, room, { kind, entity }));
  const more = button(`+ ${texts(ctx).add}`, add, { kind: "add-chip" });
  return b2`<div class="chips">${chips}${more}</div>${search}`;
}
function windowsBody(ctx, room) {
  const text = texts(ctx);
  const draft = setupDraft(ctx, room);
  const onInput = (value) => setSetup(ctx, room, { window_delay: value });
  const delay = { ...LIMITS.window_delay, step: 5, onInput };
  return b2`${entityChips(ctx, room, { kind: "win", list: draft.windows })}
    ${numberField(text.delay, draft.window_delay, delay)}
    <div class="dim small">${text.window_help}</div>`;
}
function marginText(ctx, room) {
  const typed = String(setupDraft(ctx, room).room_margin).replace(",", ".");
  const margin = Number(typed) || LIMITS.room_margin.initial;
  return `${formatNumber(margin, formatting(ctx), { min: 1, max: 1 })} \xB0C`;
}
function sensorEntry(ctx, room, sensor) {
  const name = nameOf(ctx, sensor);
  const value = Number(ctx.gateway.states[sensor]?.state);
  const shown = formatTemp(value, formatting(ctx));
  const temperature = Number.isNaN(value) ? A : b2` <span class="dim">· ${shown}</span>`;
  const remove = () => unpick(ctx, room, { kind: "rs", entity: sensor });
  return b2`<div class="entry"><ha-icon icon="mdi:thermometer"></ha-icon>
    <span class="grow ellipsis"><span class="block">${name}${temperature}</span>
      <span class="block dim small ellipsis">${sensor}</span></span>
    <button class="x" aria-label=${`${texts(ctx).remove}: ${name}`} @click=${remove}>✕</button>
  </div>`;
}
function marginStepper(ctx, room) {
  const text = texts(ctx);
  const step = (steps, word) => {
    const label = steps < 0 ? "\u2212" : "+";
    return button(label, () => stepMargin(ctx, room, steps), { kind: "round", aria: word });
  };
  return b2`<div class="stepper"><span class="grow">${text.room_margin}</span>
    ${step(-1, text.margin_less)}<span class="value">${marginText(ctx, room)}</span>
    ${step(1, text.margin_more)}</div>`;
}
function sensorBody(ctx, room) {
  const text = texts(ctx);
  const sensor = setupDraft(ctx, room).room_sensor;
  const note = b2`<div class="dim small">${text.rs_workaround}</div>`;
  if (!sensor) {
    const area = areaOf(ctx, room.thermostats[0] || "");
    const search = pickerView(ctx, { room, kind: "rs", exclude: [], area });
    return b2`${search}<div class="dim small">${text.room_help}</div>${note}`;
  }
  const help = fill(text.room_closed_help, { margin: marginText(ctx, room) });
  return b2`${sensorEntry(ctx, room, sensor)}${marginStepper(ctx, room)}
    <div class="dim small">${help}</div>${note}`;
}
function summaries(ctx, room) {
  const draft = setupDraft(ctx, room);
  const names = (list) => list.map((entity) => nameOf(ctx, entity)).join(", ");
  const delay = Math.round(Number(draft.window_delay) || 0);
  const sensor = draft.room_sensor && `${nameOf(ctx, draft.room_sensor)} \xB7 ${marginText(ctx, room)}`;
  const windows = draft.windows.length && `${names(draft.windows)} \xB7 ${delay} s`;
  return { th: names(draft.thermostats) || "\u2013", win: windows || "\u2013", rs: sensor || "\u2013" };
}
function sections(ctx, room) {
  const text = texts(ctx);
  const summary = summaries(ctx, room);
  const list = setupDraft(ctx, room).thermostats;
  const bodies = {
    th: () => entityChips(ctx, room, { kind: "th", list }),
    win: () => windowsBody(ctx, room),
    rs: () => sensorBody(ctx, room)
  };
  const titles = { th: text.thermostats, win: text.windows_doors, rs: text.room_sensor };
  const part = (key) => ({ key, title: titles[key], summary: summary[key], body: bodies[key] });
  return ["th", "win", "rs"].map((key) => section(ctx, part(key)));
}
function roomSetupView(ctx, room, status) {
  const text = texts(ctx);
  const draft = setupDraft(ctx, room);
  const word = status.active ? text.pause_room : text.activate_room;
  const pause = button(word, () => toggleActive(ctx, room), { kind: "btn flat small" });
  const save2 = button(text.save, () => commitSetup(ctx, room));
  return b2`<div class="setup">
    ${textField(text.name, draft.name, (name) => setSetup(ctx, room, { name }))}
    ${sections(ctx, room)}
    <div class="actions">${pause}<span class="grow"></span>${save2}</div>
    <div class="dim small">${text.pause_help}</div></div>`;
}

// src/state/actions/week.js
function setWeekDay(ctx, room, { day, plan: plan2 }) {
  editWeek(ctx, room, (draft) => draft.week[day] = plan2);
}
function setFreeDay(ctx, room, plan2) {
  editWeek(ctx, room, (draft) => draft.free_day = plan2);
}
function resetWeek(ctx, room) {
  ctx.store.update((store) => delete store.drafts.weeks[room.id]);
}
function commitWeek(ctx, room) {
  const { week, free_day } = weekDraft(ctx, room);
  return save(ctx, async () => {
    const saved = await commitRoom(ctx, room, { week, free_day });
    resetWeek(ctx, room);
    await poke(ctx, [saved]);
  });
}

// src/ui/views/week.js
function planSelect(ctx, room, { selected, label, onChange }) {
  const list = room.plans.map(
    (plan2) => (
      /** @type {[string, string]} */
      [plan2, planName(ctx, room, plan2)]
    )
  );
  return b2`<select aria-label=${label} ?disabled=${!ctx.store.data.admin}
    @change=${(event) => onChange(event.target.value)}>${options(list, selected)}</select>`;
}
function weekDay(ctx, room, day) {
  const text = texts(ctx);
  const selected = weekDraft(ctx, room).week[day] || room.plans[0];
  const onChange = (plan2) => setWeekDay(ctx, room, { day, plan: plan2 });
  const mark2 = ["sat", "sun"].includes(day) ? b2`<sup>*</sup>` : A;
  return b2`<div class="week-day"><span>${text.wd_short[day]}${mark2}</span>
    ${planSelect(ctx, room, { selected, label: text.weekdays[day], onChange })}</div>`;
}
function weekView(ctx, room) {
  const text = texts(ctx);
  const free = {
    selected: weekDraft(ctx, room).free_day,
    label: text.free_days,
    onChange: (plan2) => setFreeDay(ctx, room, plan2)
  };
  const actions = { cancel: () => resetWeek(ctx, room), save: () => commitWeek(ctx, room) };
  const bar2 = isWeekDirty(ctx, room) ? saveBar([text.unsaved, text.cancel, text.save], actions) : A;
  return b2`<div class="week">${WEEK.map((day) => weekDay(ctx, room, day))}</div>
    <div class="week-row free"><span>${text.free_days}</span>${planSelect(ctx, room, free)}</div>
    <div class="dim small">* ${text.only_if_working}. ${text.week_help}</div>${bar2}`;
}

// src/ui/views/rooms.js
var TABS = ["control", "plan", "week", "setup"];
function roomMain(ctx, room, status) {
  const unreachable = b2` <span class="chip bad">${texts(ctx).unavailable}</span>`;
  return b2`<span class="room-main">
    <span class="room-name">${room.name}${status.unavailable ? unreachable : A}</span>
    <span class="room-line ${lookOf(status).list}">${statusLine(ctx, room, status)}</span>
  </span>`;
}
function roomHead(ctx, room, status) {
  const look = lookOf(status);
  const open = ctx.store.ui.openRoom === room.id;
  const temperature = status.current != null ? `${formatNumber(status.current, formatting(ctx))}\xB0` : "\u2013";
  const chevron = open ? "mdi:chevron-up" : "mdi:chevron-down";
  const toggle = () => toggleRoom(ctx, room.id);
  return b2`<button class="room-head" aria-expanded=${open} @click=${toggle}>
    <span class="room-icon ${look.list}"><ha-icon icon=${look.icon}></ha-icon></span>
    ${roomMain(ctx, room, status)}
    <span class="room-temp">${temperature}</span><ha-icon class="chevron" icon=${chevron}></ha-icon>
  </button>`;
}
function tabs(ctx, room, tab) {
  const text = texts(ctx);
  const shown = TABS.filter((key) => key !== "setup" || ctx.store.data.admin);
  const button2 = (key) => b2`<button
      class=${tab === key ? "on" : ""}
      aria-pressed=${tab === key}
      @click=${() => showTab(
    ctx,
    room.id,
    /** @type {any} */
    key
  )}
    >
      ${text[`v_${key}`]}
    </button>`;
  return b2`<div class="tabs" role="group">${shown.map(button2)}</div>`;
}
function heatingSwitch(ctx, room, status) {
  const text = texts(ctx);
  const on = !status.heatingOff;
  const disabled = !room.heating_switch && !ctx.store.data.admin;
  return b2`<label class="switch" title=${on ? text.turn_off : text.turn_on}>
    <span>${text.heating_l_cap}</span><button class="toggle ${on ? "on" : ""}" role="switch"
      aria-checked=${on} ?disabled=${disabled} @click=${() => togglePower(ctx, room)}>
      <i></i></button>
  </label>`;
}
function roomDetail(ctx, room, { tab, status }) {
  if (tab === "plan") return planView(ctx, room, status);
  if (tab === "week") return weekView(ctx, room);
  if (tab === "setup" && ctx.store.data.admin) return roomSetupView(ctx, room, status);
  return controlView(ctx, room, status);
}
function roomView(ctx, room) {
  const status = statusOf(ctx, room);
  const head = roomHead(ctx, room, status);
  if (ctx.store.ui.openRoom !== room.id) return b2`<div class="room">${head}</div>`;
  const tab = ctx.store.ui.tab[room.id] || "control";
  return b2`<div class="room open">
    ${head}
    <div class="room-bar">
      ${tabs(ctx, room, tab)}${heatingSwitch(ctx, room, status)}
    </div>
    ${roomDetail(ctx, room, { tab, status })}
  </div>`;
}
function roomsView(ctx) {
  const { rooms: rooms2, admin } = ctx.store.data;
  if (rooms2.length) return rooms2.map((room) => roomView(ctx, room));
  const text = texts(ctx);
  const add = b2`<button class="btn" @click=${() => showView(ctx, "settings")}>
    ${text.add_room}
  </button>`;
  return b2`<div class="note">${text.no_rooms}</div>
    ${admin ? add : A}`;
}

// src/ha/settings.js
async function saveDayScript(gateway, { id, script, input }) {
  const use = script.use_blueprint;
  const cfg = { ...script, use_blueprint: { ...use, input: { ...use.input, ...input } } };
  await gateway.saveConfig(`script/config/${id}`, cfg);
  return cfg;
}

// src/state/actions/settings.js
function setCalendar(ctx, { calendar, on }) {
  editSettings(ctx, (draft) => {
    const others = draft.calendars.filter((item) => item !== calendar);
    draft.calendars = on ? [...others, calendar] : others;
  });
}
function setDaySetting(ctx, change) {
  editSettings(ctx, (draft) => Object.assign(draft, change));
}
function addRule(ctx) {
  editSettings(ctx, (draft) => draft.rules.push({ keyword: "", plan: "" }));
}
function setRule(ctx, index, change) {
  editSettings(ctx, (draft) => Object.assign(draft.rules[index], change));
}
function deleteRule(ctx, index) {
  editSettings(ctx, (draft) => draft.rules.splice(index, 1));
}
function moveRuleUp(ctx, index) {
  if (index < 1) return;
  editSettings(ctx, ({ rules }) => rules.splice(index - 1, 2, rules[index], rules[index - 1]));
}
function resetSettings(ctx) {
  ctx.store.update((store) => store.drafts.settings = null);
}
function settingsInput(draft) {
  const rules = draft.rules.filter((rule) => rule.keyword.trim());
  const ruleInput = (rule) => rule.plan ? { keyword: rule.keyword.trim(), plan: rule.plan } : { keyword: rule.keyword.trim() };
  const { calendars, workday, exceptions, holidays } = draft;
  return { calendars, rules: rules.map(ruleInput), workday, exceptions, holidays: holidays || "" };
}
async function storeSettings(ctx) {
  const input = settingsInput(settingsDraft(ctx));
  const change = { id: scriptId(ctx.config), script: ctx.store.data.script, input };
  const cfg = await saveDayScript(ctx.gateway, change);
  const exceptions = cfg.use_blueprint.input.exceptions || null;
  ctx.store.update((store) => Object.assign(store.data, { script: cfg, exceptions }));
  resetSettings(ctx);
  await publishHome(ctx);
}
function commitSettings(ctx) {
  return save(ctx, async () => {
    await storeSettings(ctx);
    await waitForReload(ctx.gateway, ctx.config.day_script);
    const days = await loadDayList(ctx);
    ctx.store.update((store) => store.data.days = days);
    await poke(ctx);
  });
}
function setExercise(ctx, change) {
  editExercise(ctx, (draft) => Object.assign(draft, change));
}
function commitExercise(ctx) {
  const draft = exerciseDraft(ctx);
  const { min, max, initial } = LIMITS.exercise_wait;
  const time = /^\d{1,2}:\d{2}$/.test(draft.exercise_time) ? `${draft.exercise_time}:00` : draft.exercise_time;
  const wait = clamp(Math.round(Number(draft.exercise_wait) || initial), min, max);
  const input = { exercise_day: draft.exercise_day, exercise_time: time, exercise_wait: wait };
  return save(ctx, async () => {
    for (const room of ctx.store.data.allRooms) await commitRoom(ctx, room, input);
    ctx.store.update((store) => store.drafts.exercise = null);
  });
}
async function exerciseNow(ctx) {
  if (await attempt(ctx, () => runExercise(ctx.gateway)))
    flash(ctx, { key: "exercise_started", bad: false });
}

// src/ui/views/day-settings.js
function entityOptions(ctx, { fits, none = false }) {
  const states = Object.values(ctx.gateway.states).filter(fits);
  const list = states.map((state) => [
    state.entity_id,
    state.attributes.friendly_name || state.entity_id
  ]);
  return (
    /** @type {Array<[string, string]>} */
    none ? [["", texts(ctx).none], ...list] : list
  );
}
function isCalendar(state) {
  return state.entity_id.startsWith("calendar.");
}
function workdayPart(ctx) {
  const text = texts(ctx);
  const draft = settingsDraft(ctx);
  const field = (label, key, kind) => {
    const onChange = (value) => setDaySetting(ctx, { [key]: value });
    return selectField(label, { list: entityOptions(ctx, kind), selected: draft[key], onChange });
  };
  return b2`${field(text.workday_sensor, "workday", { fits: isWorkday })}
    ${field(text.exceptions_calendar, "exceptions", { fits: isCalendar })}
    ${field(text.holiday_calendar, "holidays", { fits: isCalendar, none: true })}`;
}
function isWorkday(state) {
  return state.entity_id.startsWith("binary_sensor.") && Array.isArray(state.attributes.workdays);
}
function calendarsPart(ctx) {
  const draft = settingsDraft(ctx);
  const own = [draft.exceptions, draft.holidays];
  const box = ([calendar, name]) => {
    const change = (event) => setCalendar(ctx, { calendar, on: event.target.checked });
    return b2`<label class="check"><input type="checkbox"
      .checked=${draft.calendars.includes(calendar)} @change=${change}> ${name}</label>`;
  };
  const calendars = entityOptions(ctx, { fits: isCalendar });
  return calendars.filter(([calendar]) => !own.includes(calendar)).map(box);
}
function ruleRow(ctx, { rule, index }) {
  const text = texts(ctx);
  const up = { kind: "icon", disabled: index === 0, aria: text.move_up };
  const remove = button("\u2715", () => deleteRule(ctx, index), { kind: "icon", aria: text.delete });
  const keyword = (event) => setRule(ctx, index, { keyword: event.target.value });
  const plan2 = (event) => setRule(ctx, index, { plan: event.target.value });
  return b2`<div class="rule-row">
    <input .value=${rule.keyword} placeholder=${text.keyword} aria-label=${text.keyword}
      @input=${keyword}>
    <select aria-label=${text.plan} @change=${plan2}>
      ${options(ruleChoices(ctx, rule), rule.plan)}</select>
    ${button("\u2191", () => moveRuleUp(ctx, index), up)}${remove}</div>`;
}
function ruleChoices(ctx, rule) {
  const text = texts(ctx);
  const names = [.../* @__PURE__ */ new Set([...allPlanNames(ctx), ...rule.plan ? [rule.plan] : []])];
  const plans = names.map((name) => [name, `\u2192 ${text.plan}: ${name}`]);
  return (
    /** @type {Array<[string, string]>} */
    [["", `\u2192 ${text.rule_free}`], ...plans]
  );
}
function rulesPart(ctx) {
  const rules = settingsDraft(ctx).rules.map((rule, index) => ruleRow(ctx, { rule, index }));
  const add = button(`+ ${texts(ctx).add_rule}`, () => addRule(ctx), { kind: "btn flat small" });
  return b2`${rules}${add}`;
}
function daySettingsPanel(ctx, part) {
  const text = texts(ctx);
  if (!ctx.store.data.script) return b2`<div class="note">${text.no_script}</div>`;
  const bodies = { "days-wd": workdayPart, "days-cal": calendarsPart, "days-rules": rulesPart };
  const cancel = button(text.cancel, () => resetSettings(ctx), { kind: "btn flat small" });
  return b2`<div class="panel">${bodies[part](ctx)}
    ${actionRow(
    cancel,
    button(text.save, () => commitSettings(ctx))
  )}</div>`;
}
function daySettingsParts(ctx) {
  const text = texts(ctx);
  const input = ctx.store.data.script?.use_blueprint?.input || {};
  const workday = ctx.gateway.states[input.workday]?.attributes.friendly_name || input.workday;
  const calendars = count(asList(input.calendars).length, text.calendars_n);
  return [
    ["days-wd", text.day_wd, workday || "\u2013"],
    ["days-cal", text.keyword_calendars, calendars],
    ["days-rules", text.rules, count((input.rules || []).length, text.rules_n)]
  ];
}

// src/ui/views/settings.js
var EXERCISE_KEY = "exercise";
function roomInfo(ctx, room) {
  const text = texts(ctx);
  const parts = [
    count(room.thermostats.length, text.thermostats_short),
    count(room.windows.length, text.windows_short),
    ...room.room_sensor ? [text.room_sensor_short] : [],
    ...statusOf(ctx, room).active ? [] : [text.paused]
  ];
  return parts.join(" \xB7 ");
}
function roomRow(ctx, room) {
  const open = () => goToSetup(ctx, room.id);
  const info = b2`<span class="block dim small">${roomInfo(ctx, room)}</span>`;
  return b2`<div class="settings-row"><button class="settings-head plain" @click=${open}>
    <span class="grow"><span class="block">${room.name}</span>${info}</span>
    <ha-icon class="chevron" icon="mdi:chevron-right"></ha-icon></button></div>`;
}
function partRow(ctx, { key, title, summary = "", body, chevron = true }) {
  const open = ctx.store.ui.settingsPart === key;
  const name = open ? "mdi:chevron-up" : "mdi:chevron-down";
  const icon = chevron ? b2`<ha-icon class="chevron" icon=${name}></ha-icon>` : A;
  const brief = open || !summary ? A : b2`<span class="dim small ellipsis">${summary}</span>`;
  const toggle = () => toggleSettingsPart(ctx, key);
  return b2`<div class="settings-row">
    <button class="settings-head plain" aria-expanded=${open} @click=${toggle}>${title}
      <span class="grow"></span>${brief}${icon}</button>
    ${open ? body() : A}</div>`;
}
function addRoomForm(ctx) {
  const text = texts(ctx);
  const form = ctx.store.ui.addRoom;
  const name = textField(text.name, form.name, (value) => setNewRoomName(ctx, value));
  const chips = entityChips(ctx, null, { kind: "th", list: form.thermostats });
  const close = () => toggleSettingsPart(ctx, "add");
  const row = actionRow(
    button(text.cancel, close, { kind: "btn flat small" }),
    button(text.create, () => commitNewRoom(ctx))
  );
  return b2`<div class="panel">${name}<div class="field">${text.thermostats}</div>${chips}
    <div class="dim small">${text.new_room_paused}</div>${row}</div>`;
}
function exerciseDays(ctx) {
  const text = texts(ctx);
  const days = WEEK.map((day) => [day, text.weekdays[day]]);
  return (
    /** @type {Array<[string, string]>} */
    [["off", text.off], ...days]
  );
}
function exerciseFields(ctx) {
  const text = texts(ctx);
  const draft = exerciseDraft(ctx);
  const day = (value) => setExercise(ctx, { exercise_day: value });
  const time = (event) => setExercise(ctx, { exercise_time: event.target.value });
  const wait = (value) => setExercise(ctx, { exercise_wait: value });
  const days = { list: exerciseDays(ctx), selected: draft.exercise_day, onChange: day };
  const waiting = { ...LIMITS.exercise_wait, step: 5, onInput: wait };
  const clock = String(draft.exercise_time).slice(0, 5);
  return b2`${selectField(text.exercise_day, days)}
    <label class="field">${text.exercise_time}
      <input type="time" .value=${clock} @change=${time}></label>
    ${numberField(text.exercise_wait, draft.exercise_wait, waiting)}`;
}
function exercisePanel(ctx) {
  const text = texts(ctx);
  const asking = ctx.store.ui.confirming === EXERCISE_KEY;
  const run = () => confirmed(ctx, EXERCISE_KEY, () => exerciseNow(ctx));
  const label = asking ? text.really_exercise : text.exercise_now;
  const now2 = button(label, run, { kind: `btn flat small ${asking ? "asking" : ""}` });
  const save2 = button(text.save, () => commitExercise(ctx));
  return b2`<div class="panel">${exerciseFields(ctx)}
    <div class="dim small">${text.exercise_help}</div>
    <div class="actions">${now2}<span class="grow"></span>${save2}</div></div>`;
}
function exerciseLine(ctx) {
  const text = texts(ctx);
  const settings = exerciseSettings(ctx);
  if (settings.exercise_day === "off") return text.off;
  return `${text.wd_short[settings.exercise_day]} ${String(settings.exercise_time).slice(0, 5)}`;
}
function dayRows(ctx) {
  const row = ([key, title, summary]) => {
    const body = () => daySettingsPanel(ctx, key);
    return partRow(ctx, { key, title: b2`<span>${title}</span>`, summary, body });
  };
  return daySettingsParts(ctx).map(row);
}
function settingsView(ctx) {
  const text = texts(ctx);
  const addTitle = b2`<span class="accent">+ ${text.add_room}</span>`;
  const form = () => addRoomForm(ctx);
  const add = partRow(ctx, { key: "add", title: addTitle, body: form, chevron: false });
  const exerciseTitle = b2`<span>${text.exercise_sub}</span>`;
  const body = () => exercisePanel(ctx);
  const exercise = { key: "exercise", title: exerciseTitle, summary: exerciseLine(ctx), body };
  const title = (words) => b2`<div class="settings-title">${words}</div>`;
  const rooms2 = ctx.store.data.rooms.map((room) => roomRow(ctx, room));
  return b2`${title(text.rooms)}${rooms2}${add}${title(text.day_settings)}${dayRows(ctx)}
    ${title(text.exercise)}${partRow(ctx, exercise)}`;
}

// src/ui/views/app.js
function pageOf(ctx) {
  const { view } = ctx.store.ui;
  return view === "settings" && !ctx.store.data.admin ? "rooms" : view;
}
function titleOf(ctx, page) {
  const text = texts(ctx);
  if (page === "rooms")
    return ctx.config.title ? b2`<div class="title">${ctx.config.title}</div>` : b2`<span></span>`;
  return b2`<button class="back" @click=${() => showView(ctx, "rooms")}>
    <ha-icon icon="mdi:chevron-left"></ha-icon>${page === "days" ? text.days : text.settings}
  </button>`;
}
function dayChip(ctx, page) {
  if (!ctx.store.data.days) return A;
  const text = texts(ctx);
  const day = today(ctx);
  const classes = `day-chip ${day.free ? "free" : ""} ${page === "days" ? "on" : ""}`;
  return b2`<button class=${classes} title=${text.days} @click=${() => showView(ctx, "days")}>
    ${day.free ? text.free_day : text.working_day}${day.plan ? ` \xB7 ${day.plan}` : ""}
  </button>`;
}
function gear(ctx, page) {
  if (!ctx.store.data.admin) return A;
  const label = texts(ctx).settings;
  return b2`<button
    class="icon-button ${page === "settings" ? "on" : ""}"
    title=${label}
    aria-label=${label}
    @click=${() => showView(ctx, "settings")}
  >
    <ha-icon icon="mdi:cog"></ha-icon>
  </button>`;
}
function pageView(ctx, page) {
  const { data } = ctx.store;
  if (data.noDirectory && !data.admin)
    return b2`<div class="note">${texts(ctx).no_directory}</div>`;
  if (!data.rooms) return b2`<div class="note">…</div>`;
  if (page === "days") return daysView(ctx);
  if (page === "settings") return settingsView(ctx);
  return roomsView(ctx);
}
function cardView(ctx) {
  const page = pageOf(ctx);
  return b2`<ha-card>
    <div class="top">
      ${titleOf(ctx, page)}<span class="grow"></span>${dayChip(ctx, page)}${gear(ctx, page)}
    </div>
    ${banners(ctx)}
    <div class="body">${pageView(ctx, page)}</div>
  </ha-card>`;
}

// src/card.js
var RELOAD_MS = 10 * 60 * 1e3;
var TICK_MS = 60 * 1e3;
function tolerant(subscription) {
  return subscription.catch((error) => {
    console.warn("Weekheat: a subscription was refused", error);
    return () => {
    };
  });
}
var WeekheatCard = class extends i4 {
  static styles = STYLES;
  /** A card with nothing loaded; it re-renders whenever its store changes. */
  constructor() {
    super();
    this.store = new Store();
    this.gateway = new Gateway();
    this.ctx = null;
    this.watched = "";
    this.subscriptions = [];
    this.timers = null;
    this.store.subscribe(() => this.requestUpdate());
  }
  /**
   * Home Assistant's call with the card's options; invalid ones throw (see cardConfig).
   * @param {Record<string, any>} config
   */
  setConfig(config) {
    const settings = cardConfig(config);
    this.ctx = makeContext({ store: this.store, gateway: this.gateway, config: settings });
    this.store.ui.layout = rememberedLayout() || settings.layout;
    this.start();
    this.requestUpdate();
  }
  /**
   * Home Assistant's object, new on every state change in the home; the card renders again only
   * when a state it shows changed.
   * @param {any} hass
   */
  set hass(hass) {
    this.gateway.use(hass);
    this.start();
    if (!this.ctx) return;
    const watched = watchedStates(this.ctx);
    if (watched !== this.watched) this.requestUpdate();
    this.watched = watched;
  }
  /** On the page: load, and start the timers and subscriptions. */
  connectedCallback() {
    super.connectedCallback();
    this.start();
  }
  /** Off the page (Home Assistant detaches cards, e.g. when the view changes): stop them. */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.stop();
  }
  /** Start loading, the timers and the subscriptions, once the card is on the page and set up. */
  start() {
    if (!this.isConnected || !this.gateway.hass || !this.ctx || this.timers) return;
    const ctx = this.ctx;
    this.timers = [
      setInterval(() => load(ctx), RELOAD_MS),
      setInterval(() => this.requestUpdate(), TICK_MS)
    ];
    const notes2 = (all) => ctx.store.update((store) => store.data.notes = all);
    this.subscriptions = [tolerant(subscribeNotifications(this.gateway, notes2))];
    if (!this.gateway.isAdmin)
      this.subscriptions.push(tolerant(watchDirectory(this.gateway, () => load(ctx))));
    load(ctx);
  }
  /** Stop the timers and end the subscriptions. */
  stop() {
    (this.timers || []).forEach((timer) => clearInterval(timer));
    this.timers = null;
    this.subscriptions.forEach((subscription) => subscription.then((end) => end()));
    this.subscriptions = [];
  }
  /**
   * The card's content.
   * @returns {unknown}
   */
  render() {
    if (!this.ctx || !this.gateway.hass) return b2`<ha-card></ha-card>`;
    return cardView(this.ctx);
  }
  /**
   * The card's height in the masonry view, in units of 50 px.
   * @returns {number}
   */
  getCardSize() {
    return 2 + (this.store.data.rooms?.length ?? 1);
  }
  /**
   * The options a new card starts with in the card picker.
   * @returns {object}
   */
  static getStubConfig() {
    return {};
  }
};

// src/index.js
if (!customElements.get("weekheat-card")) {
  customElements.define("weekheat-card", WeekheatCard);
  const description = "Heating plans with working-day and free-day plans for heat-only thermostats.";
  const page = (
    /** @type {any} */
    window
  );
  page.customCards = page.customCards || [];
  page.customCards.push({ type: "weekheat-card", name: "Weekheat", description });
  console.info(`%c WEEKHEAT %c ${VERSION} `, "background:#ff8a50;color:#fff", "");
}
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/lit-html.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-element/lit-element.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/directive-helpers.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/directive.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/async-directive.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/directives/ref.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
