angular.module( 'riass' )
	.factory( 'autocompleteService', [ '$rootScope', '$http', '$q', '$timeout', function ( $rootScope, $http, $q, $timeout ) {
		var
			autocompleteService = {};

		function Autocomplete( options ) {
			var
				_options = angular.extend( {
					allowQuery   : false
				}, options || {} ),
				_isLoading = false,
				_suggest = [],
				_value = '',
				_queryId = '',
				_highlightedIndex = 0,
				updateDefer,
				instance = {
					get suggest() { return _suggest },
					get value() { return _value },
					set value( v ) { _value = v },
					set queryId( v ) { _queryId = v },
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
					query = _value,
					queryId = _queryId;

				_isLoading = true;

				abortCurrentUpdate();
				updateDefer = $q.defer();

				$http.get(
					$rootScope.__getUrl( '//API/autocomplete' ),
					{
						params  : {
							q     : query,
							limit : limit
						},
						timeout : updateDefer.promise
					} )
					.then(
					function ( res ) {
						if ( _value != query || queryId != _queryId ) {
							defer.reject();
							// Request has changed
							return;
						}
						_suggest = angular.isArray( res.data.data )
							? res.data.data
						    : [];
						resetHighlightedIndex();
						defer.resolve( _suggest );
					},
					errorHandler
				)
					.finally( function () {
						_isLoading = false;
					} );

				function errorHandler() {
					defer.reject()
				}

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
				_isLoading = false;
				abortCurrentUpdate();
				if ( updateTimer ) {
					$timeout.cancel( updateTimer );
				}
			}

			return instance;
		}


		autocompleteService.Autocomplete = Autocomplete;


		return autocompleteService;
	} ] );