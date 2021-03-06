const HTML = require('html-parse-stringify');

const util = require("./util");
var lastTextNode = null;

function createAttributedStrings(htmlSource) {
  htmlSource = `<span>${htmlSource}</span>`;
  var ast = HTML.parse(htmlSource.replace(/<br>/gmi, "\n"));
  var tree = getParsedTree(ast[0]);
  lastTextNode = null;
 return getAttributedStringsFromTree(tree);
}

function getParsedTree(ast, parent) {
  var res = { children: [] };
  if (!ast)
    return res;

  res.style = Object.assign({}, parent && parent.style ? parent.style : {}, ast.attrs && ast.attrs.style ? getParsedStyleObject(ast.attrs.style) : {});

  if (ast.attrs) {
    if (ast.attrs.color)
      res.style.color = ast.attrs.color;
    if (ast.attrs.face)
      res.style["font-family"] = ast.attrs.face;
    if (ast.attrs.size)
      res.style["font-size"] = ast.attrs.size;
    if (ast.attrs.href)
      res.style["href"] = ast.attrs.href;
  }

  if (ast.type === "text") {
    res.value = ast.content;
    lastTextNode = res;
  }
  else if (ast.type === "tag") {
    if (ast.name === "br" || ast.name === "div")
      lastTextNode && (lastTextNode.value += "\n");
    else if (ast.name === "u")
      res.style["text-decoration-line"] = "underline";
    else if (ast.name === "b")
      res.style["font-weight"] = "bold";
    else if (ast.name === "i")
      res.style["font-style"] = "italic";
    else if (ast.name === "s" || ast.name === "strike") {
      res.style.strike = true;
      ast.attrs.style.color && (res.style.strikethroughColor = ast.attrs.style.color);
    }
  }
  if (ast.voidElement === false) {
    ast.children.forEach(c => res.children.push(getParsedTree(c, res)));
  }
  return res;
}

function getParsedStyleObject(style) {
  var res = {};
  var styles = style.split(";");
  styles.forEach(item => {
    var oneStyle = item.trim().split(": ");
    oneStyle.length === 2 && (res[oneStyle[0]] = oneStyle[1]);
  });
  return res;
}

function getAttributedStringsFromTree(tree, resStrings) {
  resStrings = resStrings || [];

  var obj = { font: {} };

  if (tree.value) {
    if (tree.style["font-family"]) {
      var parsedFamily = tree.style["font-family"].split(/_|-/);
      parsedFamily.length === 3 && parsedFamily.shift();
      parsedFamily[0] && (Object.assign(obj, {
        font: {
          family: parsedFamily[0]
        }
      }));
      if (parsedFamily[1]) {
        obj.font.style = parsedFamily[1];
        obj.font.bold = /bold/i.test(obj.font.style);
        obj.font.italic = /italic/i.test(obj.font.style);
      }
    }
    tree.style["href"] && (obj.link = tree.style["href"]);
    tree.style["font-size"] && (obj.font.size = Math.floor(parseFloat(tree.style["font-size"])));
    tree.style["font-weight"] && (obj.font.bold = tree.style["font-weight"] === "bold");
    tree.style["font-style"] && (obj.font.italic = tree.style["font-style"] == "italic");

    tree.style["background-color"] && (obj.backgroundColor = tree.style["background-color"]);
    tree.style["color"] && (obj.foregroundColor = tree.style["color"]);

    tree.style["text-decoration-line"] && tree.style["text-decoration-line"].indexOf("underline") !== -1 && (obj.underline =true);
    tree.style["text-decoration-color"] && (obj.underlineColor = tree.style["text-decoration-color"]);

    if (tree.style.strike || (tree.style["text-decoration-line"] && tree.style["text-decoration-line"].indexOf("line-through") !== -1)) {
      obj.strikethrough = true;
      tree.style["text-decoration-color"] && (obj.strikethroughColor = tree.style["text-decoration-color"]);
      tree.style.strikethroughColor && (obj.strikethroughColor = tree.style.strikethroughColor);
    }

    obj.string = tree.value;
    Object.keys(obj.font).length === 0 && (delete obj.font);
    util.updateTextDecorationColors(obj);
    obj = util.clearProps(obj);
    if (resStrings.length && util.isEqualProps(resStrings[resStrings.length - 1], obj)) {
      resStrings[resStrings.length - 1].string += obj.string;
    }
    else {
      resStrings.push(obj);
    }
  }
  tree.children.forEach(t => {
    getAttributedStringsFromTree(t, resStrings);
  });
 
  return resStrings;
}



module.exports = createAttributedStrings;
