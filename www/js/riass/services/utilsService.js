angular.module( 'riass' )
	.factory( 'utilsService', [ '$q', '$window', function ( $q, $window ){
		var
			windowElement = angular.element( $window ),
			utilsService = {
				plural : function ( num, endings ){
					var
						r10, r100, plr;
					if ( isNaN( num ) ){
						return;
					}
					if ( ! endings.length ){
						return num;
					}
					r10 = num % 10;
					r100 = num % 100;
					plr = (r10 == 1 && r100 != 11)
						? 0
						: (
						(r10 >= 2 && r10 <= 4 && (r100 < 10 || r100 >= 20) )
							? 1
							: 2
						);
					return endings[plr].replace( '%d', num )
				},

				PromisesCollector : function (){
					function Collector(){
						var
							_items = [];
						return {
							add : function (){
								_items.push.apply( _items, arguments );
								return this;
							},
							reset : function (){
								_items = [];
								return this;
							},
							run : function (){
								return $q.all( _items ).then( this.reset );
							}
						}
					}
					return Collector();
				},

				openPopup : function ( options ){
					var
						_options = angular.extend( {
							url : '',
							name : 'popup',
							width : 600,
							height : 600,
							centered : true,
							scrollbars : true
						}, options || {} ),
						params = _.pick( _options, 'width', 'height' ),
						popup;

					if ( _options.centered ){
						params.top = Math.max( 0, 0.5 * ( windowElement.height() - _options.height ) );
						params.left = Math.max( 0, 0.5 * ( windowElement.width() - _options.width ) );
					}
					if ( _options.scrollbars ){
						params.scrollbars = 'yes';
					}
					popup = $window.open(
						_options.url,
						_options.name,
						_.reduce(
							params,
							function ( memo, value, key ){
								memo.push( [ key, value ].join( '=' ) );
								return memo;
							},
							[]
						).join( ',' )
					);
					return popup;
				},

				moveArrayElement : function ( array, from, to ){
					array.splice( to, 0, array.splice( from, 1 )[0] );
				},

				checkObject : function ( par, key ){
					if ( ! angular.isObject( par[key] ) || angular.isArray( par[key] ) ){
						par[key] = {};
					}
					return this;
				},
				checkArray : function ( par, key ){
					if ( ! angular.isArray( par[key] ) ){
						par[key] = [];
					}
					return this;
				},

				uriQueryArray : function ( params ){
					var query = [];
					angular.forEach( params, function ( param, key ){
						if ( angular.isArray( param ) && param.length ){
							angular.forEach( param, function ( value ){
								query.push( [ key, value ].join( '[]=' ) )
							});
						}
					})
					return query.join( '&' );
				},

				/**
				 * @requires moment lib
				 * @param string
				 */
				stringToDate : function ( string ){
				    if ( ! $window.moment ){
					    throw new Error( 'Cannot convert string to date without moment lib' );
				    }
					return $window.moment( string ).toDate();
				},

				isNullDate : function ( string ){
					return string == '0000-00-00 00:00:00';
				},

				isObjectsEqual : function ( obj1, obj2 ){
					return $window.JSON && $window.JSON.stringify
						? $window.JSON.stringify( obj1 ) === $window.JSON.stringify( obj2 )
						: false
				},


				guid : function (){
					return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
						var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
						return v.toString(16);
					});
				},

				appendScript : function ( src ){
					var
						script = document.createElement( 'script' ),
						sibling = document.getElementsByTagName( 'script' )[0];
					script.src = src;
					script.async = true;
					sibling.parentNode.insertBefore( script, sibling );
					return script;
				}

			};
		return utilsService;
	} ] );