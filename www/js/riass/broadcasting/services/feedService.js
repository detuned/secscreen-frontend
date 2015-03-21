angular.module( 'riass.broadcasting' )
	.service( 'feedService', [ '$q', '$http', '$rootScope', '$timeout', 'CONST', 'broadcastingService', 'utilsService', 'imgService',
		function ( $q, $http, $rootScope, $timeout, CONST, broadcastingService, utilsService, imgService ){
			var
				_items = [],
				_lastId = null,
				_readyDefer = $q.defer(),
				_updateDefer,
				_checkNewestTimer,
				_checkNewestInterval = 500000,
				_checkNewestMinInterval = 500000,
				_checkNewestMaxInterval = 1500000,
				_checkNewesetIntervalStep = 200000,
				_data = {
					tags    : [],
					type    : CONST.IMG_EXPORT_TYPE_BLITZ,
					q       : undefined,
					ts      : undefined,
					limit   : 10,
					offset  : 0,
					sort    : CONST.IMG_SORT_TIME_DESC,
					tagMode : CONST.TAG_MODE_OR,
					offline : $rootScope.CONFIG && $rootScope.CONFIG.offline
				},
				currentSearchConditions = {},
				_state = {
					ready          : false,
					loading        : false,
					filled         : false,
					checkingNewest : false
				},
				feedService = {
					set limit( v ){
						_data.limit = v;
						currentSearchConditions.limit = v
					},
					update          : update,
					loadMore        : loadMore,
					state           : _state,
					isDataAvailable : isDataAvailable,
					whenReady       : function (){
						return _readyDefer.promise;
					}
				};

			feedService.getItems = function (){
				return _items;
			}

			function update( options ){
				var
					_options = angular.extend( {
						isMore : false
					}, options || {} ),
					searchConditions = angular.extend( {}, _data ),
					queryParams;


				if ( _options.isMore ){
					/* Continuing prev request */
					if ( currentSearchConditions.__complete ){
						/* Oh, all images already loaded for this request */
						return;
					}
					else {
						searchConditions = angular.extend( {}, currentSearchConditions );
						searchConditions.offset = _items.length || 0;
					}
				}

				abortCurrentUpdate();
				_updateDefer = $q.defer();

				currentSearchConditions = angular.extend( {}, searchConditions );

				if ( ! isDataAvailable() ){
					resetCheckingNewest();
					return;
				}

				_state.loading = true;

				imgService.searchImages( searchConditions )
					.then( function ( images ){
						if ( ! _options.isMore ){
							_items.length = 0;
						}
						if ( images.length < searchConditions.limit ){
							currentSearchConditions.__complete = true;
						}
						angular.forEach( images, function ( image ){
							_items.push( image );
						} );
						if ( ! _options.isMore ){
							_lastId = _items[0] && _items[0].id
								? _items[0].id
								: null;
							resetCheckingNewest();

						}
						;
					} )
					.finally( function (){
						_state.loading = false;
						_state.filled = true;
					} )


			}

			function loadMore(){
				if ( _state.filled ){
					feedService.whenReady().then( function (){
						update( {
							isMore : true
						} );
					} )
				}

			}

			function abortCurrentUpdate(){
				if ( _updateDefer ){
					_updateDefer.resolve();
				}
			}

			function checkNewest(){
				if ( _state.checkingNewest ){
					return;
				}
				_state.checkingNewest = true;
				var
					searchConditions = angular.extend( {}, currentSearchConditions );
				searchConditions.limit = 100;
				searchConditions.offset = 0;
				if ( _lastId ){
					searchConditions.id = _lastId;
				}
				imgService.searchImages( searchConditions )
					.then( function ( images ){
						if ( ! images.length ){
							/*
							 *	No neweset images got
							 * Increasing checking interval step by step to max
							 */
							_checkNewestInterval = Math.min(
								_checkNewestInterval + _checkNewesetIntervalStep,
								_checkNewestMaxInterval
							);
							return;
						}
						_checkNewestInterval = _checkNewestMinInterval;
						while ( images.length ){
							_items.unshift( images.pop() );
						}
						_lastId = _items[0] && _items[0].id
							? _items[0].id
							: null
					} )
					.finally( function (){
						_state.checkingNewest = false;
						resetCheckingNewest();
					} );

			}

			function isDataAvailable(){
				return ( ! _data.ts || ( new Date ).getTime() > _data.ts * 1000 );
			}

			function resetCheckingNewest(){
				if ( _checkNewestTimer ){
					$timeout.cancel( _checkNewestTimer );
				}
				if ( ! _data.offline ){
					_checkNewestTimer = $timeout( checkNewest, _checkNewestInterval );
				}
			}

			/* Initializing */
			if ( $rootScope.broadcastingId ){
				broadcastingService.getBroadcasting( $rootScope.broadcastingId )
					.then( function ( bc ){
						if ( angular.isArray( bc.blitz_tags ) ){
							_data.tags = bc.blitz_tags;
						}
						if ( angular.isDate( bc.start_at ) ){
							_data.ts = Math.round( bc.start_at.getTime() / 1000 );
						}
						_readyDefer.resolve();
					} );
			}

			return feedService;
		}] );