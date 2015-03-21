angular.module( 'riass.broadcasting' )
	.service( 'folderSearchService', [ '$q', '$rootScope', '$timeout', 'CONST', 'utilsService', 'widgetService',
		function ( $q, $rootScope, $timeout, CONST, utilsService, widgetService ){
			var folderSearchService = {};

			function SearchEngine( data ){
				var
					_data = angular.extend( {
						autoUpdate : false,
						offline : $rootScope.CONFIG && $rootScope.CONFIG.offline
					}, data || {} ),

					/**
					 * Array of founded widgets in right order
					 */
						_widgets = [],

					/**
					 * Hash of founded widgets keyed by id
					 */
						_widgetsRegistry = {},

					_widgetsTotal = 0,

					_tags = [],
					_query = {
						value : ''
					},
					_sort = CONST.IMG_SORT_TIME_DESC,
					_state = {
						loading   : false,
						updateing : false,
						disabled  : false,
						filled    : false
					},
					_isCompletelyLoad = false,
					loadDelay = 100,
					loadTimer,
					loadedNum = 0,
					updateTimer,
					updateInterval = 100000, //XXX in real life it could be much often
					lastTimestamp = 0,
					limit = 5,
					_newWidgetsIndexes = [],
					pubStatus = [],
					widgetChecker = (function (){
						var
							checkers = {};

						function check( widget ){
							if ( checkers[widget.id] ){
								return;
							}
							var
								searchParams = {
									tags       : _tags,
									offset     : 0,
									limit      : 1,
									pub_status : pubStatus,
									id         : [ widget.id ]
								};
							if ( _query.value ){
								searchParams.q = _query.value;
							}
							checkers[widget.id] = true;

							widgetService
								.searchWidgets( searchParams )
								.then(function ( widgetsData ){
									if ( ! checkers[widget.id] || ! _widgetsRegistry[widget.id] ){
										/* Request was aborted or widget was removed by other reasons */
										return;
									}
									if ( ! widgetsData.widgets || ! widgetsData.widgets.length ){
										instance.removeWidget( widget );
									}
								})
								.finally(function (){
								    delete checkers[widget.id];
								} );
						}

						function abortAll(){
							checkers = {};
						}

						$rootScope.$on( 'widgetUpdated', function ( event, eventData ){
						    var
							    widget = eventData.widget;
							if ( widget &&
							     widget.id &&
							     _widgetsRegistry[widget.id] &&
							     _data.autoUpdate &&
							     ( _tags.length || _query.value ) ){
								check( widget );
							}
						})
						return {
							abortAll : abortAll
						}
					})(),
					instance = {
						get widgets(){
							return _widgets
						},
						get tags(){
							return _tags
						},
						get query(){
							return _query
						},
						get queryValue(){
							return _query.value
						},
						get sort(){
							return _sort;
						},

						get total(){
							return _widgetsTotal;
						},
						set sort( v ){
							_sort = v;
						},
						set query( v ){
							_query.value = v
						},
						set limit( newLimit ){
							limit = Math.max( 1, newLimit );
						},
						set pubStatus( v ){
							pubStatus = angular.isArray( v )
								? v
								: [ v ];
						},
						state         : _state,
						applyTags     : function ( tags ){
							_tags.length = 0;
							angular.forEach( tags, function ( tag ){
								_tags.push( tag );
							} )
						},
						refresh       : function (){
							clearWidgets();
							_isCompletelyLoad = false;
							load();
						},
						loadMore      : function (){
							if ( ! _isCompletelyLoad ){
								load();
							}
						},
						disable       : function (){
							_state.disabled = true;
						},
						enable        : function (){
							_state.disabled = false;
						},
						removeWidget  : function ( widgetData ){
							var
								index;
							if ( widgetData && widgetData.id ){
								index = getWidgetIndex( widgetData.id );
								if ( index !== false ){
									_widgets.splice( index, 1 );
									if ( index < _newWidgetsIndexes.length  ){
										_newWidgetsIndexes.shift();
									}
								}
								delete _widgetsRegistry[ widgetData.id ];
								_widgetsTotal  = Math.max( 0, _widgetsTotal - 1 );
							}
						},
						isWidgetNew   : function ( index ){
							return ! ! _newWidgetsIndexes[ index ];
						},
						stopUpdating  : stopUpdating,
						startUpdating : startUpdating
					};


				function getWidgetIndex( id ){
					var
						index,
						widget = _.find( _widgets, function ( item, ind ){
							if ( + item.id == + id ){
								index = ind;
								return true;
							}
						} );
					return widget
						? index
						: false;
				}

				function load( force ){
					if ( loadTimer ){
						$timeout.cancel( loadTimer );
					}
					if ( true !== force ){
						loadTimer = $timeout( _.partial( load, true ), loadDelay );
						return;
					}
					if ( _state.loading ){
						return;
					}
					var searchParams = {
						tags       : _tags,
						offset     : loadedNum,
						limit      : limit,
						pub_status : pubStatus,
						sort       : _sort
					};

					if ( _query.value ){
						searchParams.q = _query.value;
					}

					_state.loading = true;

					if ( ! loadedNum ){
						resetUpdateTimer();
						widgetChecker.abortAll();
					}

					widgetService
						.searchWidgets( searchParams )
						.then( function ( widgetsData ){
							if ( widgetsData.widgets.length < limit ){
								_isCompletelyLoad = true;
							}
							angular.forEach( widgetsData.widgets, function ( widgetData ){
								_widgets.push( widgetData );
								//TODO check if unique or not
								_widgetsRegistry[ widgetData.id ] = widgetData;
							} );
							loadedNum = _widgets.length;
							_widgetsTotal = + widgetsData.total || loadedNum; //TODO remove loadedNum
							if ( ! searchParams.offset && widgetsData.widgets[0] && widgetsData.widgets[0].updated_at ){
								updateLastTimestamp( widgetsData.widgets[0].updated_at )
							}
						} )
						.finally( function (){
							_state.loading = false;
							_state.filled = true;
							if ( ! searchParams.offset ){
								resetUpdateTimer();
							}
						} );
				}


				function clearWidgets(){
					_widgets.length = 0;
					_widgetsRegistry = {};
					_widgetsTotal = 0;
					_newWidgetsIndexes = [];
					loadedNum = 0;
				}

				function update(){
					if ( ! _data.autoUpdate ){
						return;
					}
					if ( _state.loading || _state.updating || ! _state.filled ){
						resetUpdateTimer();
						return;
					}
					var searchParams = {
						tags       : _tags,
						offset     : 0,
						limit      : 5,
						pub_status : pubStatus,
						ts         : lastTimestamp,
						sort       : _sort
					};
					if ( _query.value ){
						searchParams.q = _query.value;
					}

					widgetService
						.searchWidgets( searchParams )
						.then( function ( widgetsData ){
							var updateDate;
							while ( widgetsData.widgets.length ){

								(function (){
									var
										widgetData = widgetsData.widgets.pop(),
										index;
									if ( widgetData.id in _widgetsRegistry ){
										/* This widget already exists in folder. Place it to the first place */
										index = getWidgetIndex( widgetData.id );
										if ( index !== false ){
											utilsService.moveArrayElement( _widgets, index, 0 );
										}
										if ( ! _newWidgetsIndexes[ index ] ){
											_newWidgetsIndexes.unshift( true );
										}
									}
									else {
										_widgets.unshift( widgetData );
										_widgetsRegistry[ widgetData.id ] = widgetData;
										_newWidgetsIndexes.unshift( true );
									}

									if ( widgetData.updated_at ){
										updateDate = widgetData.updated_at;
									}
								})();
							}
							if ( updateDate ){
								updateLastTimestamp( updateDate );
							}
						} )
						.finally( function (){
							_state.updating = false;
							resetUpdateTimer();
						} )

					_state.updating = true;

				}

				function resetUpdateTimer(){
					if ( updateTimer ){
						$timeout.cancel( updateTimer );
					}
					if ( _data.autoUpdate && ! _data.offline ){
						updateTimer = $timeout( update, updateInterval );
					}
				}

				function stopUpdating(){
					_data.autoUpdate = false;
					resetUpdateTimer();
				}

				function startUpdating(){
					_data.autoUpdate = true;
					resetUpdateTimer();
				}


				/**
				 * Checks is given string contains date
				 * and if so set it's value in seconds to LastTimestamp
				 * @param updateString
				 */
				function updateLastTimestamp( updateString ){
					var updatedDate;
					try{
						updatedDate = utilsService.stringToDate( updateString );
					}
					catch ( e ){
					}
					if ( angular.isDate( updatedDate ) ){
						lastTimestamp = Math.floor( updatedDate.getTime() / 1000 );
					}
				}

				$rootScope.$on( 'widgetDeleted', function ( event, eventData ){
					if ( eventData && eventData.widget && eventData.widget.id ){
						instance.removeWidget( eventData.widget );
					}
				} );

				return instance;
			}

			folderSearchService.getSearchEngine = SearchEngine;


			return folderSearchService;
		} ] );