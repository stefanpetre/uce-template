import '@ungap/custom-elements';
import createContent from '@ungap/create-content';

import {
  augmentor,
  useState, useRef,
  useContext, createContext,
  useCallback, useMemo, useReducer,
  useEffect, useLayoutEffect
} from 'augmentor';

import {partial} from 'tag-params';
import {define, render, html, svg, css} from 'uce';

import stateHandler from 'reactive-props';
const domHandler = stateHandler({dom: true, useState});

import QSAO from 'qsa-observer';
const query = [];
const {drop, parse} = QSAO({
  query,
  handle(element, _, selector) {
    drop([element]);
    if (toBeDefined.has(selector)) {
      const define = toBeDefined.get(selector);
      toBeDefined.delete(selector);
      define();
    }
  }
});

import {cache, cjs, asCJS} from 'uce-require';
const {loader} = cjs;

const empty = {};
const toBeDefined = new Map;

// preloaded imports
cache['@uce/reactive'] = stateHandler({useState});
cache['augmentor'] = {
  augmentor,
  useState, useRef,
  useContext, createContext,
  useCallback, useMemo, useReducer,
  useEffect, useLayoutEffect
};
cache['qsa-observer'] = QSAO;
cache['reactive-props'] = stateHandler;
cache['uce'] = {define, render, html, svg, css};

define('uce-template', {
  props: null,
  extends: 'template',
  init() {
    const defineComponent = content => {
      const component = script ? loader(content) : {setup: () => empty};
      const {observedAttributes, props} = component;
      const params = partial(template);
      const definition = {
        props: null,
        extends: as ? name : 'element',
        init() {
          const self = this;
          const {html} = self;
          let init = true;
          let context = null;
          (this.render = augmentor(() => {
            if (init) {
              init = false;
              if (props)
                domHandler(self, props);
              context = component.setup(self);
            }
            html.apply(null, params(context));
          }))();
        }
      };
      if (css)
        definition.style = () => css;
      if (shadow)
        definition.attachShadow = {mode: shadow};
      if (observedAttributes) {
        definition.observedAttributes = observedAttributes;
        definition.attributeChanged = function () {
          if (this.hasOwnProperty('attributeChanged'))
            this.attributeChanged.apply(this, arguments);
        };
      }
      if (script) {
        definition.connected = function () {
          if (this.hasOwnProperty('connected'))
            this.connected();
        };
        definition.disconnected = function () {
          if (this.hasOwnProperty('disconnected'))
            this.disconnected();
        };
      }
      define(as || name, definition);
    };
    const {content, innerHTML, ownerDocument, parentNode} = this;
    const {childNodes} = content || createContent(innerHTML);
    const styles = [];
    // IE11 has issues with live template elements, so this will get removed
    if (parentNode && getComputedStyle(this, null).getPropertyValue('display') !== 'none')
      parentNode.removeChild(this);
    let later = defineComponent;
    let as = '';
    let css = '';
    let name = '';
    let script = '';
    let shadow = '';
    let template = '';
    for (let i = 0; i < childNodes.length; i++) {
      const child = childNodes[i];
      if (child.nodeType === 1) {
        const {tagName} = child;
        const is = child.hasAttribute('is');
        if (/^style$/i.test(tagName))
          styles.push(child);
        else if (is || /-/i.test(tagName)) {
          if (name)
            throw new Error('bad template');
          name = tagName.toLowerCase();
          template = child.innerHTML.replace(
                      /\{\{([^\2]+?)(\}\})/g,
                      (_, $1) => '${' + $1 + '}'
                    );
          if (is)
            as = child.getAttribute('is').toLowerCase();
          if (child.hasAttribute('shadow'))
            shadow = child.getAttribute('shadow') || 'open';
        }
        else if (/^script$/i.test(tagName)) {
          if (script)
            throw new Error('bad template');
          script = child.textContent;
          later = () => {
            asCJS(script, true).then(defineComponent);
          };
        }
      }
    }
    const selector = as ? (name + '[is="' + as + '"]') : name;
    for (let i = styles.length; i--;) {
      const child = styles[i];
      const {textContent} = child;
      if (child.hasAttribute('shadow'))
        template = '<style>' + textContent + '</style>' + template;
      else if (child.hasAttribute('scoped')) {
        const def = [];
        css += textContent.replace(
                /\{([^}]+?)\}/g,
                (_, $1) => '\x01' + def.push($1) + ','
              )
              .split(',')
              .map(s => (s.trim() ? (selector + ' ' + s.trim()) : ''))
              .join(',\n')
              .replace(/\x01(\d+),/g, (_, $1) => '{' + def[--$1] + '}')
              .replace(/(,\n)+/g, ',\n');
      }
      else
        css += textContent;
    }
    if (this.hasAttribute('lazy')) {
      toBeDefined.set(selector, later);
      query.push(selector);
      parse(ownerDocument.querySelectorAll(query));
    }
    else
      later();
  }
});

export const resolve = (name, module) => {
  if (name in cache)
    throw new Error('duplicated ' + name);
  cache[name] = module;
};
