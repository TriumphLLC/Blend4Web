function snakeToCamel(str) {
  return str.replace(/(\_\w)/g, function(m) {
    return m[1].toUpperCase();
  });
}

exports.snakeToCamel = snakeToCamel;
