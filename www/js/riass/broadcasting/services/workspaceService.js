angular.module( 'riass.broadcasting' )
	.service( 'workspaceService', [ '$q', '$http', '$timeout', '$rootScope', 'settingsService', 'widgetService', 'notifyService',
		function ( $q, $http, $timeout, $rootScope, settingsService, widgetService, notifyService ){
			var
				_wsWidgets = [],
				_wsWidgetsRegistry = {},
				scale = 400,
				_globalWidgetsNum = 0,
				_preservedState = {},
				stopUndo = function(){},
				workspaceService = {},
				STATES = {
					VIEW : 'view',
					EDIT : 'edit'
				}
			workspaceService.STATES = STATES;
			function WorkspaceWidget( data ){
				var
					_defaultData = {
						top   : 0,
						left  : 0,
						state : STATES.VIEW
					},
					/**
					 * Instance of wigetService.Widget() related to _data.id
					 */
						_widget,
					/**
					 * Current state of widget's fields in editing
					 */
						_editWidget = {},
					_state = {
						loading     : false,
						removing    : false,
						highlighted : false,
						error       : false,
						/**
						 * Fresh flag is on until widget saved by user after it was created
						 * If editing of 'fresh' widget will be cancelled, it means widget
						 * creating was mistake and we can remove it
						 */
						fresh       : false,
						aboutRemove : false

					},
					_errorMsg = '',
					_data = angular.extend( {}, _defaultData ),
					widgetReadyDefer = $q.defer(),
					_externalDataNormalizers = [],
					instance = {
						get id(){
							return _data.id
						},
						set id( v ){
							linkWidget( v )
						},
						get globalId(){
							return _data.globalId
						},
						get state(){
							return _data.state
						},
						set state( newState ){
							if ( newState == _data.state ){
								return;
							}
							if ( newState == STATES.EDIT && _widget ){
								_state.error = false;
								_errorMsg = '';
								updateEditWidget();
							}
							_data.state = newState;
							triggerWidgetChange();
						},
						get left(){
							return _data.left
						},
						set left( v ){
							_data.left = v
						},
						get top(){
							return _data.top
						},
						set top( v ){
							_data.top = v
						},
						get widget(){
							return _widget
						},
						get editWidget(){
							return _editWidget
						},
						get isLoading(){
							return _state.loading
						},
						get isRemoving(){
							return _state.removing
						},
						get isHighlighted(){
							return _state.highlighted
						},
						get isError(){
							return _state.error
						},
						get isFresh(){
							return _state.fresh
						},
						set fresh( v ){
							_state.fresh = ! ! v
						},
						get errorMsg(){
							return _errorMsg
						},
						get status(){
							return getStatus()
						},
						get isAboutRemove(){
							return _state.aboutRemove
						},
						set aboutRemove( v ){
							_state.aboutRemove = ! ! v
						},
						onRemove         : function ( options ){
							var
								_options = angular.extend( { fast : false }, options || {} ),
								defer = $q.defer();
							_state.removing = true;
							if ( _options.fast ){
								defer.resolve();
							}
							else {
								$timeout( function (){
									defer.resolve();
								}, 150 );
							}
							return defer.promise;
						},
						update           : function ( d ){
							angular.extend( _data, _.omit( d, 'id' ) );
						},
						toJson           : function (){
							var json = {
								top  : _data.top,
								left : _data.left
							};
							if ( _data.id ){
								json.id = _data.id;
								json.state = _data.state;
								if ( _data.state == STATES.EDIT ){
									json.editWidget = _editWidget;
								}
							}
							return json;
						},
						whenWidgetLinked : function (){
							return widgetReadyDefer.promise;
						},
						saveEdited       : function (){
							var defer = $q.defer();
							_state.loading = true;
							_widget.applyEditObject( _editWidget )
								.then(
								function ( res ){
									/*
									 * Since widget successfully saved it not fresh now
									 * and it cannot be delete on cancel editing
									 */
									_state.fresh = false;
									defer.resolve( res );
								},
								function ( error ){
									_state.error = true;
									_errorMsg = 'Error saving. ' + ( error
										? error.toString()
										: '' );
									defer.reject( _errorMsg );
								}
							)
								.finally( function (){
									_state.loading = false;
								} )
							return defer.promise;
						},

						/**
						 * Registers external function to normalize
						 * editWidget after it changes
						 * XXX Now it could be only one normalizer
						 * (most likely from end-point widget type-controller)
						 * @param normalizer
						 */
						addExternalDataNormalizer : function ( normalizer ){
							_externalDataNormalizers[0] = normalizer;
							if ( ! angular.element.isEmptyObject( _editWidget ) ){
								/**
								 * Seems like editData was changed already
								 * So it has sense to run new normalizer immediately
								 */
								normalizer( _editWidget );
							}
						},
						highlight                 : function (){
							_state.highlighted = true;
							$timeout( function (){
								_state.highlighted = false;
							}, 1000 );
						}
					};

				function linkWidget( id ){
					if ( _data.id ){
						throw new Error( 'Cannot re-link widget to WorkspaceWidget (current id=' + _data.id + ' new id=' + id + ')' );
					}
					var w;
					_state.loading = true;
					_data.id = id;
					_wsWidgetsRegistry[ id ] = instance;
					_widget = widgetService.getWidget( id );
					_widget.whenLoaded().then( function (){
						_state.loading = false;
						widgetReadyDefer.resolve( _widget );
					} );
				}

				function updateEditWidget(){
					var widgetCloneForEdit = _widget.getEditObject();
					//TODO Maybe previously remove all values from _editWidget for more safe?
					if ( _widget ){
						angular.element.extend( true, _editWidget, widgetCloneForEdit );
						_editWidget.tags = widgetCloneForEdit.tags || [];
						normalizeEditWidget();
					}
				}

				/**
				 * Runs all registered external normalizers
				 * to let them fix editWidget data if needed
				 */
				function normalizeEditWidget(){
					angular.forEach( _externalDataNormalizers, function ( normalizer ){
						normalizer( _editWidget );
					} );
				}

				function getStatus(){
					if ( ! _data.id ){
						return 'New widget';
					}
					else if ( _state.loading ){
						return 'Loading...';
					}
					else if ( _widget.isPublished ){
						return 'Published';
					}
					else if ( _widget.isPreloaded ){
						return 'Preloaded';
					}
					else {
						return 'Not published';
					}
				}

				function triggerWidgetChange(){
					$rootScope.$emit( 'workspaceWidgetChanged', instance );
				}

				/* Init */
				;
				(function (){
					var existentWsWidget;
					if ( angular.isString( data ) || angular.isNumber( data ) ){
						/* If string given, we think it's id of widget  */
						return WorkspaceWidget( { id : data } );
					}
					else if ( angular.isObject( data ) ){
						if ( data.id && ( existentWsWidget = getWsWidgetById( data.id ) ) ){
							/* Widget instance with this id already exists. Update it and then return.*/
							return existentWsWidget.update( data );
						}
						angular.extend( _data, _.omit( data, 'id', 'editWidget' ) );
						if ( data.editWidget ){
							_editWidget = angular.extend( {}, data.editWidget );
						}
						else {
							instance.whenWidgetLinked().then( function (){
								updateEditWidget();
							} )
						}
						if ( data.id ){
							linkWidget( data.id );
						}
					}
					_data.globalId = _globalWidgetsNum ++;
				})();

				return instance;
			}


			/**
			 * Removes all widgets from workspace
			 */
			workspaceService.clear = function ( options ){
				var _options = angular.extend( {
					undo : false
				}, options || {} );

				if ( ! _wsWidgets.length ){
					/* Nothing to clean */
					return;
				}

				if ( _options.undo ){
					(function(){
						var message;
						_preservedState = toJson();
						message = notifyService.applyMessage( {
							text : 'Workspace cleared',
							actions : [ {
								text : 'Cancel'
							}]
						});

						stopUndo = function (){
							if ( message && message.isActivated ){
								message.deactivate();
							}
							stopUndo = function(){};
						}

						message.whenAction().then(function ( action ){
							if ( _preservedState && _preservedState.widgets ){
								workspaceService.update( _preservedState.widgets, { quite : true } );
								workspaceService.save();
							}
						});

						message.whenDeactivate().then(function ( action ){
							_preservedState = {};
							stopUndo = function(){};
						});

					})();
				}
				angular.forEach( _wsWidgets, function ( wsWidget ){
					wsWidget.onRemove( { fast : true } );
				} );
				_wsWidgets.length = 0;
				_wsWidgetsRegistry = {};
				workspaceService.save( 'keepUndo' );
			}

			/**
			 * Totally replaces all workspace state (all widgets) with given
			 */
			workspaceService.update = function ( data, options ){
				workspaceService.clear();
				var _options = angular.extend( { 'append' : true }, options )
				angular.forEach( data, function ( wsWidgetData ){
					workspaceService.addWidget( wsWidgetData, _options );
				} );
			}

			workspaceService.addWidget = function ( wsWidgetData, options ){
				var
					_options = angular.extend( {
						quite       : false,
						index       : undefined,
						afterWidget : undefined,
						append      : false
					}, options || {} ),
					wsWidget;
				if ( wsWidgetData && wsWidgetData.id && ( wsWidget = getWsWidgetById( wsWidgetData.id ) ) ){
					wsWidget.update( wsWidgetData );
					workspaceService.save();
					wsWidget.highlight();
					stopUndo();
					return;
				}
				wsWidget = WorkspaceWidget( wsWidgetData );
				if ( wsWidgetData && wsWidgetData.id ){
					_wsWidgetsRegistry[ wsWidgetData.id ] = wsWidget;

				}

				if ( angular.isDefined( _options.afterWidget ) ){
					_options.index = workspaceService.getWidgetIndex( _options.afterWidget );
					if ( ! isNaN( _options.index ) ){
						_options.index ++;
					}
				}

				if ( ! angular.isDefined( _options.index ) ){
					if ( _options.append ){
						_wsWidgets.push( wsWidget );
					}
					else {
						_wsWidgets.unshift( wsWidget );
					}
				}
				else {
					_wsWidgets.splice( _options.index, 0, wsWidget );
				}
				workspaceService.setBestPosition();
				if ( ! _options.quite ){
					workspaceService.save();
					$rootScope.$emit( 'workspace:addWidget', wsWidgetData );
					wsWidget.highlight();
				}
				return wsWidget;
			}

			workspaceService.getWidgetIndex = function ( wsWidgetData ){
				var index;
				_.find( _wsWidgets, function ( item, ind ){
					if ( + item.globalId == + wsWidgetData.globalId ){
						index = ind;
						return true;
					}
				} );
				return index;
			}

			workspaceService.changeWidget = function ( oldWsWidget, newWidgetData ){
				var
					index,
					wsWidget = _.find( _wsWidgets, function ( item, ind ){
						if ( + item.globalId == + oldWsWidget.globalId ){
							index = ind;
							return true;
						}
					} ),
					newWsWidget;
				_wsWidgets.splice( index, 1 );
				if ( oldWsWidget.id ){
					delete _wsWidgetsRegistry[ oldWsWidget.id ];
				}
				newWsWidget = workspaceService.addWidget( { id : newWidgetData.id }, { index : index } );
				newWsWidget.state = STATES.EDIT;
				return newWsWidget;
			}

			workspaceService.load = function (){
				return settingsService.load( '//CUR_USER_BC/workspace' ).then( function ( loadedData ){
					if ( loadedData && loadedData.widgets ){
						workspaceService.update( loadedData.widgets, { quite : true } );
					}
				} );
			}

				/* Saving */
			;
			(function (){
				var
					saveTimer,
					saveDelay = 400;
				/**
				 * Saves current state on server
				 */
				workspaceService.save = function ( force ){
					if ( saveTimer ){
						$timeout.cancel( saveTimer );
					}
					if ( force !== true ){
						if ( force !== 'keepUndo' ){
							stopUndo();
						}
						saveTimer = $timeout( function (){
							workspaceService.save( true );
						}, saveDelay );
						return;
					}
					var json = toJson();
					return settingsService.save( '//CUR_USER_BC/workspace', json );
				}

				$rootScope.$on( 'workspaceWidgetChanged', function ( event, wsWidget ){
					if ( wsWidget && getWsWidgetById( wsWidget.id ) ){
						workspaceService.save();
					}
				} );
			})();


			workspaceService.getWidgets = function (){
				return _wsWidgets;
			}

			workspaceService.getScale = function (){
				return scale;
			}

			workspaceService.setBestPosition = function ( options ){
				return;
				var
					_options = angular.extend( {
					}, options || {} ),
					minDistanceBetweenWidgets = 0.1,
					hasChanges;
				angular.forEach( _wsWidgets, function ( wsWidget, index ){
					var
						top = 0,
						left = index * ( 1 + minDistanceBetweenWidgets );
					if ( wsWidget.left != left || wsWidget.top != top ){
						wsWidget.left = left;
						wsWidget.top = top;
						hasChanges = true;
					}
				} );
				if ( ( hasChanges || _options.save === true ) && _options.save !== false ){
					workspaceService.save();
				}
			}

			workspaceService.removeWidget = function ( w ){
				var
					index,
					defer = $q.defer(),
					wsWidget = _.find( _wsWidgets, function ( item, ind ){
						if ( + item.globalId == + w.globalId ){
							index = ind;
							return true;
						}
					} );
				if ( wsWidget ){
					wsWidget.onRemove()
						.then( function (){
							_wsWidgets.splice( index, 1 );
							delete _wsWidgetsRegistry[ wsWidget.id ];
							workspaceService.setBestPosition( { save : false } );
							workspaceService.save();
							defer.resolve();
						}, defer.reject );
				}
				else {
					defer.reject();
				}

				return defer.promise;
			}

			function getWsWidgetById( id ){
				return angular.isObject( id )
					? _wsWidgetsRegistry[ id.id ]
					: _wsWidgetsRegistry[ id ];
			}

			function toJson(){
				var json = { widgets : [] };
				angular.forEach( _wsWidgets, function ( wsWidget ){
					json.widgets.push( wsWidget.toJson() );
				} )
				return json;
			}

			/**
			 * Creates widget with given image in it and adds it to workspace
			 * If widgetFromImage object is defined in config
			 * it will be used as template for new widget.
			 * If not, 'default' widget will be created
			 * Using broadcasting tags if they're exists
			 * @param image
			 */
			workspaceService.addWidgetByImage = function ( image ){
				var
					widget,
					configWidgetData = $rootScope.CONFIG.widgetFromImage,
					configWidgetTags,
					tags = $rootScope.broadcasting && angular.isArray( $rootScope.broadcasting.tags )
						? $rootScope.broadcasting.tags
						: [],
					widgetData;

				if ( angular.isObject( configWidgetData ) ){
					configWidgetTags = configWidgetData.tags;

					/*
					 *	Searching and replacing placeholders:
					 *  — %IMG% to full image object
					 *  — %IMG.TITLE% to image title
					 */
					try{
						configWidgetData = angular.fromJson(
							angular.toJson( configWidgetData )
								.replace( /"%IMG%"/g, angular.toJson( image ) )
								.replace( /"%IMG\.TITLE%"/g, angular.toJson( image.title || '' ) )
						);
					}
					catch ( e ) {}
					if ( configWidgetData && configWidgetData.type ){
						widgetData = configWidgetData;
						if ( configWidgetTags && configWidgetTags.length ){
							if ( configWidgetTags[0] === true ){
								tags = [];
								configWidgetTags.shift();
							}
							tags = tags.concat( configWidgetTags );
						}
					}
				}
				if ( ! widgetData ){
					/*
					 * Applying 'default' tag when config says nothing
					 */
					widgetData = {
						type   : 'default',
						fields : {
							img : image
						}
					};
				}

				widgetData.tags = tags;

				widget = widgetService.getWidget( widgetData );

				return widget.whenLoaded().then( function (){
					var wsWidget = workspaceService.addWidget( { id : widget.id, state : workspaceService.STATES.EDIT } );
					wsWidget.fresh = true;
				} );
			}


			$rootScope.$on( 'widgetDeleted', function ( event, eventData ){
				var wsWidget;
				if ( eventData &&
					eventData.widget &&
					eventData.widget.id &&
					( wsWidget = getWsWidgetById( eventData.widget.id ) )
					){
					workspaceService.removeWidget( wsWidget );
				}
			} );

			$rootScope.$on( 'widgetLoadError', function ( event, eventData ){
				var wsWidget;
				if ( eventData &&
					eventData.widget &&
					eventData.widget.id &&
					( wsWidget = getWsWidgetById( eventData.widget.id ) )
					){
					workspaceService.removeWidget( wsWidget );
				}
			} );

			return workspaceService;
		}] );