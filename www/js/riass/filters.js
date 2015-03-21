angular.module( 'riass' )
	.filter( 'dateFormat', [function (){
		return function ( str, format ){
			return str ? moment( str ).format( format ) : '';
		}
	}] )
	.filter( 'truncate', [function (){
		return _.string.truncate;
	}])
	.filter('nl2br', function () {
		return function(text) {
			return text
				? text.replace(/\n/g, '<br/>')
				: '';
		}
	})