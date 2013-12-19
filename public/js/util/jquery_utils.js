(function() {jQuery.fn['bounds'] = function () {
  var bounds = {
    left: Number.POSITIVE_INFINITY,
    top: Number.POSITIVE_INFINITY,
    right: Number.NEGATIVE_INFINITY,
    bottom: Number.NEGATIVE_INFINITY,
    width: Number.NaN,
    height: Number.NaN
  };

  this.each(function (i,el) {
    var elQ = $(el);
    var off = elQ.offset();
    off.right = off.left + $(elQ).outerWidth();
    off.bottom = off.top + $(elQ).outerHeight();

    if (off.left < bounds.left)
    bounds.left = off.left;

    if (off.top < bounds.top)
    bounds.top = off.top;

    if (off.right > bounds.right)
    bounds.right = off.right;

    if (off.bottom > bounds.bottom)
    bounds.bottom = off.bottom;
  });

  bounds.width = bounds.right - bounds.left;
  bounds.height = bounds.bottom - bounds.top;
  return bounds;
}})();

(function() {jQuery.fn['center'] = function () {
  var offset = $(this[0]).offset();
  var width = offset.left
  return {x: offset.left+$(this[0]).outerWidth()/2, y: offset.top+$(this[0]).outerHeight()/2}
}})();

/**
 * jQuery alterClass plugin
 *
 * Remove element classes with wildcard matching. Optionally add classes:
 *   $( '#foo' ).alterClass( 'foo-* bar-*', 'foobar' )
 *
 * Copyright (c) 2011 Pete Boere (the-echoplex.net)
 * Free under terms of the MIT license: http://www.opensource.org/licenses/mit-license.php
 *
 */
(function ( $ ) {
  
$.fn.alterClass = function ( removals, additions ) {
  
  var self = this;
  
  if ( removals.indexOf( '*' ) === -1 ) {
    // Use native jQuery methods if there is no wildcard matching
    self.removeClass( removals );
    return !additions ? self : self.addClass( additions );
  }
 
  var patt = new RegExp( '\\s' + 
      removals.
        replace( /\*/g, '[A-Za-z0-9-_]+' ).
        split( ' ' ).
        join( '\\s|\\s' ) + 
      '\\s', 'g' );
 
  self.each( function ( i, it ) {
    var cn = ' ' + it.className + ' ';
    while ( patt.test( cn ) ) {
      cn = cn.replace( patt, ' ' );
    }
    it.className = $.trim( cn );
  });
 
  return !additions ? self : self.addClass( additions );
};
 
})( jQuery );