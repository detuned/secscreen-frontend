angular.module( 'riass.broadcasting' )
	.service( 'widgetService', [ '$q', '$http', '$timeout', '$rootScope', 'CONST', 'widgetsCollectionService', 'utilsService', 'imgService', 'eventsService', 'broadcastingService', 'settingsService',
		function ( $q, $http, $timeout, $rootScope, CONST, widgetsCollectionService, utilsService, imgService, eventsService, broadcastingService, settingsService ){
			var
				widgetService = {},
			/* Widgets hash keyed by id */
				widgetsRegistry = {},

				allTypes = [],
				allTypesByName = {},
				typeToIdMap = {},
				idToTypeMap = {},

				/**
				 * Creates function to load widget data by id via organizing queue,
				 * and preventing too often server requests by combining them to macro one
				 */
					loadWidgetData = (function (){
					var
						loadingDelay = 100,
						maxClientsPerSet = 30,
						currentLoadingSet;

					/**
					 * Creates instance to collect and then load a number of requests
					 * Starts loading only when time gap between two requests reaches
					 * <code>loadingDelay</code> value
					 * @returns {{load: Function}}
					 * @constructor
					 */
					function LoadingSet(){
						var
							clients = {},
							clientsNum = 0,
							delayTimer;

						function resetTimer(){
							if ( delayTimer ){
								$timeout.cancel( delayTimer );
							}
						}

						function startLoading(){
							changeCurrentSet();
							var idsQuery = _.reduce( clients,function ( memo, v, id ){
								memo.push( 'id[]=' + id );
								return memo;
							}, [] ).join( '&' );
							$http.get( $rootScope.__getUrl( '//API/widget?' + idsQuery ), { params : { limit : _.keys( clients ).length } } )
								.then( function ( res ){
									if (
										! res.data || ! angular.isDefined( res.data.data ) || ! angular.isArray( res.data.data.widgets )
										){
										sendErrorToAllClients( res );
										return;
									}
									var
										resData = res.data.data && res.data.data.widgets
											? res.data.data.widgets
											: [],
										clientsData = {};

									/* Iterating through response data
									 and sending to clients with matching id */
									angular.forEach( resData, function ( resItem ){
										if ( resItem.id && clients[ resItem.id ] ){
											angular.forEach( clients[ resItem.id ], function ( client ){
												client.resolve( resItem );
											} );
											delete clients[ resItem.id ];
										}
									} );

									/* Sending error to clients not found in response */
									sendErrorToAllClients( {} );

								}, sendErrorToAllClients );
						}

						function sendErrorToAllClients( errorData ){
							angular.forEach( clients, function ( clientsList, id ){
								angular.forEach( clientsList, function ( client ){
									client.reject( errorData );
								} )
							} )
						}

						return {
							load : function ( id ){
								var clientDefer = $q.defer();
								resetTimer();
								if ( ! clients[id] ){
									clients[id] = [];
									clientsNum ++;
								}
								clients[id].push( clientDefer );
								if ( clientsNum >= maxClientsPerSet ){
									startLoading();
								}
								else {
									delayTimer = $timeout( startLoading, loadingDelay );
								}
								return clientDefer.promise;
							}
						};
					}

					function changeCurrentSet(){
						currentLoadingSet = LoadingSet();
					}

					changeCurrentSet();

					return function ( id ){
						return currentLoadingSet.load( id )
					}
				})(),

				searchWidgets = function ( conditions ){
					var
						defer = $q.defer(),
						_conditions = angular.extend( {
							tags           : [],
							pub_status     : [],
							q              : undefined,
							limit          : 5,
							offset         : 0,
							registerLoaded : true,
							sort           : undefined,
							bcast_id       : undefined,
							ts             : undefined,
							id             : []
						}, conditions || {} ),
						queryParams = utilsService.uriQueryArray( _.pick( _conditions, 'tags', 'pub_status', 'id' ) );


					$http
						.get(
						$rootScope.__getUrl( '//API/widget' ) + ( queryParams
							? '?' + queryParams
							: ''),
						{ params : _.pick( _conditions, 'q', 'limit', 'offset', 'sort', 'bcast_id', 'ts' ) }
					)
						.then(
						function ( res ){
							var
								resData = angular.isDefined( res.data.data )
									? res.data.data
									: {},
								widgetsData = angular.isArray( resData.widgets )
									? resData.widgets
									: []
							widgetsTotal = angular.isNumber( + resData.total )
								? + resData.total
								: widgetsData.length;
							if ( _conditions.registerLoaded ){
								widgetService.registerWidgets( widgetsData );
							}
							defer.resolve( {
								widgets : widgetsData,
								total   : widgetsTotal
							} );
						},
						defer.reject
					);
					return defer.promise;
				},
				widgetEditTick = $rootScope.CONFIG && $rootScope.CONFIG.widgetEditTick
					? $rootScope.CONFIG.widgetEditTick
					: 30000;


			function Widget( data, options ){
				var
					_defaultData = {
						type      : undefined,
						pub_count : 0,
						parent_id : undefined,
						attach    : [],
						tags      : []
					},
					_data = angular.extend( {}, _defaultData ),
					_options = angular.extend( {
						publishOnSave : false,
						preloadOnSave : false
					}, angular.isObject( options )
						? options
						: {} ),
					_fields = {},
					_state = {
						loading     : false,
						error       : false,
						highlighted : false
					},
					_initDefer,
					/**
					 * Hash of widget's actual editors keyed by user id
					 */
						_editors = {},
					_editorsNum = 0,
					instance = {
						get type(){
							return _data.type
						},
						get id(){
							return _data.id
						},
						get fields(){
							return _fields
						},
						get tags(){
							return _data.tags
						},
						get isPublished(){
							return _data.pub_status == CONST.WIDGET_PUB_STATUS_PUBLISH ||
								_data.pub_status == CONST.WIDGET_PUB_STATUS_PUBLISHED
						},
						get isPreloaded(){
							return ( + _data.pub_status == + CONST.WIDGET_PUB_STATUS_PRELOAD ) ||
								( + _data.pub_status == + CONST.WIDGET_PUB_STATUS_PRELOADED )
						},
						get pubStatus(){
							return _data.pub_status
						},
						get pubCount(){
							return _data.pub_count;
						},
						get parentId(){
							return _data.parent_id;
						},
						get isLoading(){
							return _state.loading
						},
						get isError(){
							return _state.error
						},
						get isStarred(){
							return widgetsCollectionService.isInCollection(
								widgetsCollectionService.COLLECTION_STARRED, instance
							);
						},
						set isStarred( v ){
							widgetsCollectionService.toggleInCollection(
								widgetsCollectionService.COLLECTION_STARRED, instance, ! ! v
							);
						},
						get isInfo(){
							return _data.isInfo
						},
						set isInfo( v ){
							return _data.isInfo = ! ! v
						},
						get isHighlighted(){
							return _state.highlighted
						},
						get isBusy(){
							return _editorsNum > 0;
						},

						get editors(){
							return _editors;
						},

						get attach(){
							return _data.attach
						},
						addAttach       : function ( a ){
							if ( ! _data.attach ){
								_data.attach = [];
							}
							_data.attach.push( a );
						},
						addTags         : function ( newTags ){
							var
								defer = $q.defer(),
								addedNum = 0;
							if ( newTags.length ){
								angular.forEach( newTags, function ( newTag ){
									if ( ! hasTag( newTag ) ){
										_data.tags.push( newTag );
										addedNum ++;
									}
								} );
							}
							if ( addedNum ){
								save()
									.then( defer.resolve, defer.reject );
							}
							else {
								defer.resolve();
							}
							return defer.promise;
						},
						update          : function ( d ){
							var id = _data.id;
							reset();
							angular.extend( _data, _.omit( d, 'fields', 'id' ) );
							if ( d.fields ){
								_fields = angular.extend( {}, d.fields );
							}
							_data.id = id;
							actualize();
							return this;
						},
						whenLoaded      : function (){
							return _initDefer.promise;
						},
						getEditObject   : function (){
							var editObject = angular.extend( {},
								_.pick( _data, 'isInfo' )
							);
							editObject.isStarred = instance.isStarred;
							editObject.attach = [].concat( _data.attach || [] );
							editObject.tags = [].concat( _data.tags || [] );
							editObject.fields = $.extend( true, {}, _fields );
							return editObject;
						},
						applyEditObject : function ( editObject ){
							var resPromise;
							angular.extend( _data, _.pick( editObject, 'isInfo' ) );
							if ( editObject.attach ){
								_data.attach = [].concat( editObject.attach || [] );
							}
							if ( editObject.tags ){
								_data.tags = [].concat( editObject.tags || [] );
							}
							if ( editObject.fields ){
								if ( ! instance.isFieldsEqualTo( editObject.fields ) ){
									/*
									 * When widget saved from workspace like this, and fields
									 * was changed, we think all
									 * old 'publication memory' has to be cleared.
									 */
									_data.pub_count = 0;

									if ( _data.parent_id ){
										(function (){
											/**
											 * On the other side, what if this widget has parent?
											 * Since we have no guarantee that child still looks similar after save,
											 * we just decrement parent's publication counter
											 */
											var parentWidget = Widget( _data.parent_id );
											parentWidget.whenLoaded().then( function (){
												parentWidget.decreasePubCount();
											} );
										})();
										_data.parent_id = null;
									}
								}

								angular.element.extend( true, _fields, editObject.fields );
							}

							resPromise = save();
							widgetsCollectionService.toggleInCollection(
								widgetsCollectionService.COLLECTION_STARRED,
								instance,
								! ! editObject.isStarred
							);
							return resPromise;
						},

						isFieldsEqualTo : function ( newFields ){
							var
								f1 = angular.element.extend( true, {}, _fields ),
								f2 = angular.element.extend( true, {}, newFields );

							function checkLevel( fieldsLevel ){
								angular.forEach( fieldsLevel, function ( item, key ){
									if ( angular.element.isPlainObject( item ) ){
										if ( imgService.isCorrectImgObject( item ) ){
											fieldsLevel[ key ] = imgService.getSimplifiedImgObject( item );
										}
										else {
											checkLevel( item );
										}
									}
								} )
							}

							checkLevel( f1 );
							checkLevel( f2 );
							return utilsService.isObjectsEqual( f1, f2 );
						},

						increasePubCount : _.partial( changePubCount, 1 ),
						decreasePubCount : _.partial( changePubCount, - 1 ),
						/* Create new widget with same data but another id */
						clone            : function (){
							var
								clone,
								dataToClone = instance.getEditObject();
							dataToClone.type = _data.type;
							clone = Widget( dataToClone );
							_state.loading = true;
							return clone.whenLoaded().then( function (){
								_state.loading = false;
								return clone;
							} );
						},
						publishClone     : function (){
							var
								defer = $q.defer(),
								dataToPublish = instance.getEditObject(),
								publishedClone;
							dataToPublish.type = _data.type;
							dataToPublish.parent_id = _data.id;
							publishedClone = Widget( dataToPublish, { publishOnSave : true } );
							_state.loading = true;

							changePubCount( 1 )
								.finally( function (){
									publishedClone.whenLoaded().then( function (){
										$rootScope.$emit( 'widgetClonedAndPublished', { widget : instance } );
										_state.loading = false;
										defer.resolve( publishedClone );
									}, defer.reject );
								} );

							return defer.promise;
						},
						publish          : function (){
							_state.loading = true;
							return $http.post( $rootScope.__getUrl( '//API/widget/publish/bcastId/' + $rootScope.broadcasting.id ),
									getDataToSave() )
								.then( function ( res ){
									var resData = res.data.data;

									if ( _data.parent_id && instance.isPreloaded ){
										(function (){
											/**
											 * Increasing publications count for widget parent
											 * when publishing preloaded widget
											 */
											var parentWidget = Widget( _data.parent_id );
											parentWidget.whenLoaded().then( function (){
												parentWidget.increasePubCount();
											} )
										})();
									}
									_data.pub_status = resData.pub_status;
									$rootScope.$emit( 'widgetPublished', { widget : instance } );
								} )
								.finally( function (){
									_state.loading = false;
								} );
						},
						preloadClone     : function (){
							var
								defer = $q.defer(),
								dataToPreload = instance.getEditObject(),
								preloadedClone;
							dataToPreload.type = _data.type;
							dataToPreload.parent_id = _data.id;
							preloadedClone = Widget( dataToPreload, { preloadOnSave : true } );
							_state.loading = true;

							preloadedClone.whenLoaded().then( function (){
								$rootScope.$emit( 'widgetClonedAndPreloaded', { widget : instance } );
								_state.loading = false;
								defer.resolve( preloadedClone );
							}, defer.reject );
							return defer.promise;
						},

						unPreload  : function (){
							var defer = $q.defer();
							if ( instance.isPublished ){
								defer.reject( 'Cannot unpreload published widget id=' + _data.id );
							}
							else{
								$http.post( $rootScope.__getUrl( '//API/widget/timeline/bcastId/' + $rootScope.broadcasting.id + '/action/delete' ),
										getDataToSave() )
									.then( function ( res ){
										var resData = res.data.data;
										_data.pub_status = resData.pub_status;
										_data.parent_id = null;
										defer.resolve( instance );
									}, defer.reject );
							}
							return defer.promise;
						},
						highlight  : function (){
							_state.highlighted = true;
							$timeout( function (){
								_state.highlighted = false;
							}, 3000 )
						},
						setBusy    : _.throttle( setBusy, 3000 ),
						setFree    : setFree,
						save       : save,
						selfDelete : selfDelete,
						state      : _state

					};

				function changePubCount( diff ){
					_data.pub_count = Math.max( 0, Number( _data.pub_count || 0 ) + diff );
					return save( { noActualization : true } );
				}

				function hasTag( tag ){
					return _.indexOf( _data.tags, tag ) > - 1;
				}

				function reset(){
					angular.forEach( _data, function ( item, key ){
						delete _data[ key ];
					} );
					angular.extend( _data, _defaultData );
					_state.loading = false;
				}

				function isDataComplete(){
					return angular.isDefined( _data.id ) && angular.isDefined( _data.type );
				}

				function load(){
					if ( ! angular.isDefined( _data.id ) ){
						throw new Error( 'Cannot load widget without id', _data );
					}
					if ( _state.loading ){
						return _initDefer.promise;
					}
					_state.loading = true;
					_state.error = false;


					loadWidgetData( _data.id )
						.then(
						function ( resData ){
							// Applying loaded data
							angular.extend( _data, _.pick( resData, 'type', 'isInfo', 'tags', 'attach', 'pub_status', 'pub_count', 'parent_id' ) );
							actualize();
							if ( angular.isObject( resData.fields ) ){
								angular.extend( _fields, resData.fields );
							}
							_initDefer.resolve();
						}, errorHandler
					)
						.finally( function (){
							_state.loading = false;
						} );

					function errorHandler(){
						_state.error = true;
						$rootScope.$emit( 'widgetLoadError', { widget : instance } );

					}

					return _initDefer.promise;
				}

				function getDataToSave(){
					var saveParams = _.pick( _data, 'id', 'type', 'isInfo', 'tags', 'attach', 'pub_count', 'parent_id' );
					if ( _data.type in typeToIdMap ){
						saveParams.type = typeToIdMap[ _data.type ];
					}
					saveParams.fields = _fields;
					return saveParams;
				}

				/**
				 * Makes all needed transformations of fields before widget saving.
				 * Works asynchronously and returns promise.
				 * @returns {promise}
				 */
				function actualizeBeforeSave( actualizeOptions ){
					var
						_actualizeOptions = angular.extend( {}, actualizeOptions || {} ),
						actualizeDefer = $q.defer(),
						batchActualizeProcess = utilsService.PromisesCollector();

					/**
					 * No actualization data needed when 'preloadOnSave' or 'publishOnSave'
					 * flags is on.
					 * Both of this flags usable for cloned widgets not originals, what means
					 * that actualization has made already.
					 */
					if ( _options.preloadOnSave || _options.publishOnSave || _actualizeOptions.noActualization ){
						actualizeDefer.resolve();
						return actualizeDefer.promise;
					}

					/**
					 * Composing the queue of data handlers.
					 * Each of them can analyze and transform fields as it want.
					 * And it has to return promise certainly
					 * The batch process finishes when all transformer's promises are done
					 */
					batchActualizeProcess
						.add( actualizeTextFields(), actualizeImgObjects() )
						.run()
						.then( actualizeDefer.resolve, actualizeDefer.reject );

					/**
					 * Searches for all text fields, and changes them
					 * by replacing all quotes types to regular "
					 * @returns {promise}
					 */
					function actualizeTextFields(){
						var defer = $q.defer();

						function checkLevel( fieldsLevel ){
							angular.forEach( fieldsLevel, function ( item, key ){
								if ( angular.element.isPlainObject( item ) && ! imgService.isCorrectImgObject( item ) ){
									checkLevel( item );
								}
								else if ( angular.isString( item ) ){
									fieldsLevel[key] = item.replace( /[\'\«\»\`\„\“\”\‘\’]/g, '"' );
								}
							} )
						}

						checkLevel( _fields );

						defer.resolve();

						return defer.promise;
					}

					/**
					 * Searhes for all img objects in fields to be cropped.
					 * And ..crop them!
					 * @returns {promise}
					 */
					function actualizeImgObjects(){
						var
							defer = $q.defer(),
							imgObjects = [],
							batchCropProcess;

						function checkLevel( fieldsLevel ){
							angular.forEach( fieldsLevel, function ( item ){
								if ( imgService.isImgNeedToBeCropped( item ) ){
									imgObjects.push( item );
									return;
								}
								if ( angular.element.isPlainObject( item ) || angular.isArray( item ) ){
									checkLevel( item );
								}
							} )
						};

						/* Searching for img objects in fields and trying to actualize it */
						checkLevel( _fields );

						if ( imgObjects.length ){
							batchCropProcess = utilsService.PromisesCollector();
							angular.forEach( imgObjects, function ( imgObject ){
								batchCropProcess.add( imgService.cropImg( imgObject ) );
							} );
							batchCropProcess.run().then( defer.resolve, defer.reject );
						}
						else {
							/* No images to crop in this widget */
							defer.resolve();
						}

						return defer.promise;
					}


					return actualizeDefer.promise;
				}

				function save( saveOptions ){
					var
						_saveOptions = angular.extend( {}, saveOptions || {} ),
						defer = $q.defer(),
						isNew = ! angular.isDefined( _data.id ),
						saveParams = {};

					if ( ! _data.type ){
						defer.reject();
						throw new Error( isNew
							? 'Cannot create widget without type'
							: 'Cannot save widget without type'
						);
					}

					_state.loading = true;
					_state.error = false;


					actualizeBeforeSave( _saveOptions ).then( function (){

							/* Composing save data */
							saveParams = getDataToSave();

							/* Saving */
							$http.post(
									_options.publishOnSave
										? $rootScope.__getUrl( '//API/widget/publish/bcastId/' + $rootScope.broadcasting.id )
										: _options.preloadOnSave
										? $rootScope.__getUrl( '//API/widget/timeline/bcastId/' + $rootScope.broadcasting.id )
										: $rootScope.__getUrl( '//API/widget' ),
									saveParams
								)
								.then(
								function ( res ){
									if ( ! res.data || ! res.data.data ){
										errorHandler();
										return;
									}
									var resData = res.data.data;
									if ( isNew ){
										if ( ! resData.id ){
											errorHandler();
											return;
										}
										_data.id = resData.id;
										widgetsRegistry[ _data.id ] = instance;
										_initDefer.resolve();
									}
									if ( _options.publishOnSave ){
										_data.pub_status = resData.pub_status;
										$rootScope.$emit( 'widgetPublished', { widget : instance } );
										_options.publishOnSave = false;
									}
									if ( _options.preloadOnSave ){
										_data.pub_status = resData.pub_status;
										$rootScope.$emit( 'widgetPreloaded', { widget : instance } );
										_options.preloadOnSave = false;
									}
									defer.resolve( instance );
									$rootScope.$emit( 'widgetUpdated', { widget : instance } );
								},
								errorHandler
							)
								.finally( function (){
									_state.loading = false;
								} );

							function errorHandler(){
								defer.reject();
								_state.error = true;
							}
						},

						function ( error ){
							/* Error actualizing before save */
							_state.error = true;
							_state.loading = false;
							defer.reject( error );
						}
					);
					return defer.promise;
				}

				function actualize(){
					if ( _data.type && ( _data.type in idToTypeMap ) ){
						_data.type = idToTypeMap[ _data.type ];
					}
				}

				function selfDelete(){
					var defer = $q.defer();
					if ( instance.isPublished ){
						defer.reject( 'Cannot delete published widget id=' + _data.id );
					}
					else if ( instance.isPreloaded ){
						defer.reject( 'Cannot delete preloaded widget id=' + _data.id );
					}
					else {
						_state.loading = true;
						$http.post( $rootScope.__getUrl( '//API/widget' ), {
							id     : _data.id,
							action : 'delete'
						} ).then(
							function ( res ){
								if ( ! res.data ){
									throw new Error( 'Deletion of widget id=' + _data.id + ' failed by server' );
									defer.reject();
									return;
								}
								if ( _data.parent_id ){
									(function (){
										var parentWidget = Widget( _data.parent_id );
										parentWidget.whenLoaded().then( function (){
											parentWidget.decreasePubCount();
										} )
									})();
								}
								delete widgetsRegistry[ _data.id ];
								$rootScope.$emit( 'widgetDeleted', { widget : instance } );
								delete instance;
								defer.resolve( res.data );
							},
							function ( error ){
								throw new Error( 'Deletion of widget id=' + _data.id + ' failed by server' );
								defer.reject( error );
							}
						).finally( function (){
								_state.loading = false;
							} );

					}
					return defer.promise;
				}

				function setBusy( options ){
					var
						_options = angular.extend( {}, options || {} ),
						editor,
						needSave;
					if ( ! _options.user ){
						if ( ! $rootScope.user ){
							return;
						}
						_options.user = angular.extend( {}, $rootScope.user || {} );
						needSave = true;
					}
					if ( ! _options.user.id ){
						/* Wrong user */
						return;
					}

					if ( editor = _editors[ _options.user.id ] ){
						/* This user already marked as editor. Just update timeout */
						if ( editor.freeTimer ){
							$timeout.cancel( editor.freeTimer );
						}
					}
					else {
						_editors[ _options.user.id ] = {};
						editor = _editors[ _options.user.id ];
						_editorsNum ++;
					}
					editor.user = _options.user;
					editor.freeTimer = $timeout( function (){
						setFree( editor );
					}, widgetEditTick );

					if ( needSave ){
						settingsService.save( '/widget/busy/' + _data.id, { busy : true }, { public : true } );
					}
				}

				function setFree( options ){
					var
						editor,
						_options = angular.extend( {}, options || {} ),
						needSave;
					if ( ! _options.user ){
						if ( ! $rootScope.user ){
							return;
						}
						_options.user = angular.extend( {}, $rootScope.user || {} );
						needSave = true;
					}
					if ( ! _options.user.id || ! ( editor = _editors[ _options.user.id ] ) ){
						/* Wrong user or not editor */
						return;
					}
					if ( editor.freeTimer ){
						$timeout.cancel( editor.freeTimer );
					}
					delete _editors[ _options.user.id ];
					_editorsNum = Math.max( 0, _editorsNum - 1 );

					if ( needSave ){
						settingsService.save( '/widget/busy/' + _data.id, { busy : false }, { public : true } );
					}
				}

				if ( angular.isString( data ) || angular.isNumber( data ) ){
					/* If string given, we think it's id of widget  */
					return Widget( { id : data } );
				}
				else if ( angular.isObject( data ) ){
					if ( data.id && ( data.id in widgetsRegistry ) ){
						/* Widget instance with this id already exists. Update it and then return.*/
						return _.keys( data ).length > 1
							? widgetsRegistry[ data.id ].update( data )
							: widgetsRegistry[ data.id ];
					}
					angular.extend( _data, _.omit( data, 'fields' ) );
					if ( data.fields ){
						_fields = angular.extend( {}, data.fields );
					}
					actualize();
				}
				else {
					throw new Error( 'Cannot create Widget instance based on ' + data );
				}

				_initDefer = $q.defer();

				if ( _data.id ){
					if ( isDataComplete() ){
						_initDefer.resolve();
					}
					else {
						load();
					}
					widgetsRegistry[ _data.id ] = instance;
				}
				else {
					save();
				}

				return instance;
			}


			widgetService.getWidget = Widget;

			widgetService.registerWidgets = function ( widgets ){
				angular.forEach( widgets, Widget );
			}

			widgetService.setWidgetTypes = function ( widgetTypes ){
				if ( ! angular.isArray( widgetTypes ) ){
					return;
				}
				allTypes = [].concat( widgetTypes );
				angular.forEach( allTypes, function ( item ){
					if ( item.name && item.id ){
						typeToIdMap[ item.name ] = item.id;
						idToTypeMap[ item.id ] = item.name;
						allTypesByName[ item.name ] = item;
					}
				} );
			}

			widgetService.getAllTypes = function (){
				return allTypes;
			}

			widgetService.getType = function ( typeName ){
				return allTypesByName[ typeName ];
			}

			widgetService.searchWidgets = searchWidgets;

			widgetService.getPublishedWidgets = function ( conditions ){
				var defer = $q.defer();

				broadcastingService.getActiveBroadcasting().then( function ( bc ){
					if ( ! bc || ! angular.isDefined( bc.id ) ){
						defer.reject( new Error( 'Cannot get published widgets because cannot active broadcasting not loaded' ) );
						return;
					}
					searchWidgets( angular.extend( conditions || {}, {
						pub_status : [
							CONST.WIDGET_PUB_STATUS_PUBLISH,
							CONST.WIDGET_PUB_STATUS_PUBLISHED
						],
						bcast_id   : $rootScope.broadcasting
							? $rootScope.broadcasting.id
							: undefined,
						sort       : 'updated_at_asc'
					} ) )
						.then( defer.resolve, defer.reject );
				}, function (){
					defer.reject( new Error( 'Cannot get published widgets because cannot load active broadcasting' ) );
				} )


				return defer.promise;
			}

			eventsService.on( eventsService.EVENTS.WIDGET_UPDATED, function ( event, widgetData ){
				var widget;
				if ( widgetData && widgetData.id ){
					widget = Widget( widgetData );
					$rootScope.$emit( 'widgetUpdated', { widget : widget } );
				}
			} );

			eventsService.on( eventsService.EVENTS.WIDGET_DELETED, function ( event, widgetData ){
				var widget;
				if ( widgetData && widgetData.id ){
					widget = Widget( widgetData );
					$rootScope.$emit( 'widgetDeleted', { widget : widget } );
					delete widgetsRegistry[ widget.id ];
				}
			} );

			eventsService.on( eventsService.EVENTS.WIDGET_TIMELINE_PUBLISHED, function ( event, widgetData ){
				if (
					widgetData && widgetData.id &&
					angular.isDefined( widgetData.bcast_id ) &&
					+ widgetData.bcast_id == + $rootScope.broadcastingId
					){
					$rootScope.$emit( 'widgetPublished', { widget : Widget( widgetData ), fromOutside : true } );
				}
			} );

			eventsService.on( eventsService.EVENTS.SETTING_CHANGED, function ( event, busyData, user, key ){
				var m, widget;
				if ( key && ( m = key.match( /^widget\/busy\/(\d+)$/ ) ) && m[1] ){
					widget = Widget( m[1] );
					widget.whenLoaded().then( function (){
						if ( ! busyData ){
							busyData = {};
						}
						busyData.user = user;
						if ( busyData.busy ){
							widget.setBusy( busyData );
						}
						else {
							widget.setFree( busyData );
						}
					} )
				}
			} )

			return widgetService;
		} ] );