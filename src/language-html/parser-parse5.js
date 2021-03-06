"use strict";

const nonFragmentRegex = /^\s*(<!--[\s\S]*?-->\s*)*<(!doctype|html|head|body)[\s>]/i;

function parse(text /*, parsers, opts*/) {
  // Inline the require to avoid loading all the JS if we don't use it
  const parse5 = require("parse5");
  const htmlparser2TreeAdapter = require("parse5-htmlparser2-tree-adapter");

  try {
    const isFragment = !nonFragmentRegex.test(text);

    const ast = (isFragment ? parse5.parseFragment : parse5.parse)(text, {
      treeAdapter: htmlparser2TreeAdapter,
      sourceCodeLocationInfo: true
    });

    return normalize(extendAst(ast));
  } catch (error) {
    throw error;
  }
}

function normalize(ast) {
  if (Array.isArray(ast)) {
    return ast.map(normalize);
  }

  if (!ast || typeof ast !== "object") {
    return ast;
  }

  delete ast.parent;
  delete ast.next;
  delete ast.prev;

  for (const key of Object.keys(ast)) {
    ast[key] = normalize(ast[key]);
  }

  return ast;
}

function extendAst(ast) {
  if (!ast || !ast.children) {
    return ast;
  }
  for (const child of ast.children) {
    extendAst(child);
    if (child.attribs) {
      child.attributes = convertAttribs(child.attribs);
    }
  }
  return ast;
}

function convertAttribs(attribs) {
  return Object.keys(attribs).map(attributeKey => {
    return {
      type: "attribute",
      key: attributeKey,
      value: attribs[attributeKey]
    };
  });
}

module.exports = {
  parsers: {
    parse5: {
      parse,
      astFormat: "htmlparser2",
      locStart(node) {
        return node.sourceCodeLocation && node.sourceCodeLocation.startOffset;
      },
      locEnd(node) {
        return node.sourceCodeLocation && node.sourceCodeLocation.endOffset;
      }
    }
  }
};
