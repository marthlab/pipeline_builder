_.mixin({
  methodEach: function(collection, method_name) {
    var method_args = Array.prototype.slice.call(arguments, 2, arguments.length);
    _.each(collection, function(value) {
      value[method_name].apply(value, method_args);
    });
    return collection;
  },
  methodMap: function(collection, method_name) {
    var method_args = Array.prototype.slice.call(arguments, 2, arguments.length);
    return _.map(collection, function(value) {
      return value[method_name].apply(value, method_args);
    });
  },
  methodFilter: function(collection, method_name) {
    var method_args = Array.prototype.slice.call(arguments, 2, arguments.length);
    return _.filter(collection, function(value) {
      return value[method_name].call(value, method_args);
    });
  },
  methodReject: function(collection, method_name) {
    var method_args = Array.prototype.slice.call(arguments, 2, arguments.length);
    return _.reject(collection, function(value) {
      return value[method_name].call(value, method_args);
    });
  },
  pushArray: function(array, items_to_push) {
    array.push.apply(array, items_to_push);
  }
});