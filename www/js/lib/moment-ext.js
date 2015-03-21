;(function( moment ){
	var extFormats = {};
	if ( ! moment ){
		return;
	}
	moment.lang( 'en', { months : [
		'Января',   'Февраля',      'Марта',
		'Апреля',   'Мая',          'Июня',
		'Июля',     'Августа',      'Сентября',
		'Октября',  'Ноября',       'Декабря'
	] } );

	moment.fn.prevFormat = moment.fn.format;
	function translateExtFormat( item, dt ){
		var
			res = item,
			diff;
		if (item.charAt(0) === "\\") {
			return item.replace("\\", "");
		}
		switch( item ){
			case 'r':
				diff = dt.diff( moment(), 'days' );
				switch(diff){
					case 0:
						res = 'сегодня';
						break;
					case 1:
						res = 'завтра';
						break;
					case 2:
						res = 'послезавтра';
						break;
					case -1:
						res = 'вчера';
						break;
					case -2:
						res = 'позавчера';
						break;
					default:
						if (diff>0){
							res = 'через ' + diff + 'дней' //TODO plural
						}
						else{
							res = diff + ' дней назад'
						}
				}
				res = '[' + res + ']';
				break;
			default:
				res = item;
		}
		return res;
	}
	moment.fn.format = function ( format ){
		var
			dt = this,
			newFormat = format.replace(/\\?./g, function ( match ){
			    return translateExtFormat( match, dt );
			});
		return this.prevFormat( newFormat );
	}


})( window.moment );