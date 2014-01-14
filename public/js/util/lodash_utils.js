_.mixin({
  methodEach: function(collection, method_name) {
    var method_args = Array.prototype.slice.call(arguments, 2, arguments.length);
    return _.each(collection, function(value) {
      value[method_name].apply(value, method_args);
    });
  },
  methodMap: function(collection, method_name) {
    var method_args = Array.prototype.slice.call(arguments, 2, arguments.length);
    return _.map(collection, function(value) {
      return value[method_name].apply(value, method_args);
    });
  },
  methodSome: function(collection, method_name) {
    var method_args = Array.prototype.slice.call(arguments, 2, arguments.length);
    return _.some(collection, function(value) {
      return value[method_name].apply(value, method_args);
    });
  },
  methodFind: function(collection, method_name) {
    var method_args = Array.prototype.slice.call(arguments, 2, arguments.length);
    return _.find(collection, function(value) {
      return value[method_name].apply(value, method_args);
    });
  },
  methodEvery: function(collection, method_name) {
    var method_args = Array.prototype.slice.call(arguments, 2, arguments.length);
    return _.every(collection, function(value) {
      return value[method_name].apply(value, method_args);
    });
  },
  methodFilter: function(collection, method_name) {
    var method_args = Array.prototype.slice.call(arguments, 2, arguments.length);
    return _.filter(collection, function(value) {
      return value[method_name].apply(value, method_args);
    });
  },
  methodReject: function(collection, method_name) {
    var method_args = Array.prototype.slice.call(arguments, 2, arguments.length);
    return _.reject(collection, function(value) {
      return value[method_name].apply(value, method_args);
    });
  },
  pushArray: function(array, items_to_push) {
    Array.prototype.push.apply(array, items_to_push);
  },
  findExact: function(collection, properties) {
    return _.find(collection, function(collection_item){
      return _.every(_.keys(properties), function(property_key) {
        return collection_item[property_key] === properties[property_key];
      });
    });
  },
  assignWithDefault: function(value, default_val) {
    return _.isUndefined(value) ? default_val : value;
  },
  noop: function() {
  },
  sortById: function(o1, o2){
    if(o1.id < o2.id) return -1;
    if(o1.id > o2.id) return 1;
    return 0;
  }
});