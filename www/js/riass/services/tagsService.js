angular.module( 'riass' )
	.factory( 'tagsService', [ '$rootScope', '$http', '$q', '$timeout', function ( $rootScope, $http, $q, $timeout ) {
		var
			newTags = {},
			tagsService = {},
			defaultTags = {};

		function getTagsIndex( tag, list ) {
			return _.indexOf( tagsService.normalizeTag( list ), tagsService.normalizeTag( tag ) );
		}


		function Autocomplete( options ) {
			var
				_options = angular.extend( {
					allowAddTags : false,
					allowQuery   : false
				}, options || {} ),
				_isLoading = false,
				_suggest = [],
				_value = '',
				_highlightedIndex = 0,
				_addTagIndex = -1,
				updateDefer,
				instance = {
					get suggest() { return _suggest },
					get value() { return _value },
					set value( v ) { _value = v },
					get isLoading() { return _isLoading },
					get isEmpty() { return !_suggest.length },
					get highlightedIndex() { return _highlightedIndex; },
					set highlightedIndex( v ) {

						if ( _options.allowQuery ) {
							if ( v > _suggest.length ) {
								v = 0;
							}
							else if ( v < -1 ) {
								v = _suggest.length - 1;
							}
						}
						else {
							if ( v > _suggest.length - 1 ) {
								v = 0;
							}
							else if ( v < 0 ) {
								v = _suggest.length - 1;
							}

						}
						_highlightedIndex = v;
					},
					get addTagIndex() { return _addTagIndex },
					getHighlighted : function () {
						return _suggest[ _highlightedIndex ];
					},
					update         : update,
					clear          : clear
				},
				updateDelay = 250,
				limit = 5,
				updateTimer;

			function resetHighlightedIndex() {
				_highlightedIndex = _options.allowQuery
					? -1
					: 0;
			}

			function update( force ) {
				if ( updateTimer ) {
					$timeout.cancel( updateTimer );
				}
				if ( force !== true ) {
					updateTimer = $timeout( _.partial( update, true ), updateDelay );
					return;
				}

				if ( !_value ) {
					clear();
					return;
				}
				var
					defer = $q.defer(),
					query = _value;

				_isLoading = true;

				abortCurrentUpdate();
				updateDefer = $q.defer();

				$http.get(
					$rootScope.__getUrl( '//API/autocomplete/tag' ),
					{
						params  : {
							q     : query,
							limit : limit
						},
						timeout : updateDefer.promise
					} )
					.then(
					function ( res ) {
						if ( _value != query ) {
							// Request has changed
							return;
						}
						var resData = res.data.data || [];
						resetHighlightedIndex();
						_addTagIndex = -1;
						_suggest = (function () {
							var s = [];
							if ( resData.length ) {
								s = _.uniq( resData );
							}
							if ( !tagsService.hasTagInList( _value, s ) && _options.allowAddTags ) {
								s.push( 'New tag: ' + _value );
								_addTagIndex = s.length - 1;
							}
							return s;
						})();
					},
					errorHandler
				)
					.finally( function () {
						_isLoading = false;
					} );

				function errorHandler() {}

				resetHighlightedIndex();


				return defer.promise;
			}

			function abortCurrentUpdate() {
				if ( updateDefer ) {
					updateDefer.resolve();
				}
			}


			function clear() {
				_suggest.length = 0;
				resetHighlightedIndex();
				_addTagIndex = -1;
				_isLoading = false;
				abortCurrentUpdate();
				if ( updateTimer ) {
					$timeout.cancel( updateTimer );
				}
			}

			return instance;
		}


		tagsService.Autocomplete = Autocomplete;

		tagsService.normalizeTag = function ( tag ) {
			if ( angular.isArray( tag ) ) {
				return _.map( tag, tagsService.normalizeTag );
			}
			return tag.toLocaleLowerCase();
		}

		tagsService.removeTag = function ( tag, list ) {
			var index = getTagsIndex( tag, list );
			if ( index > -1 ) {
				list.splice( index, 1 );
			}
		}

		tagsService.hasTagInList = function ( tag, list ) {
			return ( getTagsIndex( tag, list ) > -1 );
		}

		tagsService.getTagsIndex = getTagsIndex;

		tagsService.registerTag = function ( tag ) {
			newTags[ tag ] = true; //XXX to normalize before, or it will be too slow?
			$timeout( function () {
				if ( tag in newTags ) {
					delete newTags[tag];
				}
			}, 30000 );
			return $http.get(
				$rootScope.__getUrl( '//API/tag/ensure' ),
				{
					params : {
						tag : tag
					}
				}
			);
		}

		tagsService.isTagNew = function ( tag ) {
			return ( tag in newTags );
		}

		tagsService.markTagAsOld = function ( tag ) {
			if ( tag in newTags ) {
				delete newTags[ tag ];
			}
		}

		tagsService.setDefaultTags = function ( tags ) {
			var newDefaultTags = {};
			if ( angular.isArray( tags ) ) {
				angular.forEach( tags, function ( tag ) {
					newDefaultTags[ tag ] = true; //XXX to normalize before, or it will be too slow?
				} );
			}
			defaultTags = newDefaultTags;
		}

		tagsService.isTagDefault = function ( tag ) {
			return ( tag in defaultTags );
		}

		tagsService.isTagNotDefault = function ( tag ) {
			return ! ( tag in defaultTags );
		}

		return tagsService;
	} ] );