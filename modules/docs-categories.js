var sortObject = require('sort-object');
var minimatch = require('minimatch');
var nodePath = require('path');

function generateDocument(metalsmith, categoryFile) {
  return new Promise(function(resolve, reject) {
    metalsmith.readFile(nodePath.resolve(__dirname + '/../src/misc/category-reference.html'), function(error, file) {
      if (error) {
        return reject(error);
      }

      file.is2 = true;
      file.componentCategory = categoryFile.category;
      file.extension = categoryFile.framework;
      file.framework = categoryFile.framework;
      file.version = "v2";
      file.categoryFile = categoryFile.file;
      file.componentIndex = true;
      file.title = categoryFile.file.title;

      resolve({file: file});
    });
  });
}

var addCategory = function(file, dict) {
  file.componentCategory.split(/, */).forEach(function(category) {
    if (!dict[category]) {
      dict[category] = {};
    }
    if (!dict[category].files) {
      dict[category].files = []; 
    }
    dict[category].files.push(file);
  });
}

module.exports = function(lang) {
  return function(files, metalsmith, done) {
    var categories = {
      v1: {},
      js: {},
      angular1: {},
      react: {}
    };
    var promises = [];

    for (var path in files) {
      if (path.indexOf('v2/docs/markdown') !== -1) {
        var file = files[path];
        var category = nodePath.basename(path, ".markdown");
        var components = file.component.split(",");
        var frameworks = file.framework.split(",");

        frameworks.forEach(function(framework) {
          if (!categories[framework]) {
            categories[framework] = {};
          }
          if (!categories[framework][category]) {
            categories[framework][category] = {};
          }
          categories[framework][category].title = file.title;
          categories[framework][category].index = file;

          promises.push(generateDocument(metalsmith, { file: file, category: category, framework: framework }).then(function(result) {
            files['v2/docs/' + result.file.framework + '/' + result.file.componentCategory + '.html'] = result.file;
          }));
        });
      }
    }

    for (var path in files) {
      var file = files[path];

      if (file.componentCategory && !file.is2) {
        addCategory(file, categories.v1);
      } else if (file.componentCategory) {
        switch (file.extension) {
          case "react":
            if (files["v2/docs/js/" + file.doc.original + ".html"]) {
              file.doc.originalDoc = files["v2/docs/js/" + file.doc.original + ".html"].doc;
            }
            addCategory(file, categories.react);
            break;
          case "angular1":
            addCategory(file, categories.angular1);
            break;
          case "js":
            addCategory(file, categories.js);
            break;
        }
      }
    }

    metalsmith.metadata().componentCategories = categories;

    Promise.all(promises).then(function() {
      done();
    }).catch(function(error) {
      console.error(error);
      done();
    });
  }
};