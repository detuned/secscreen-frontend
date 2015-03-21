angular.module( 'riass.broadcasting' )
	.service( 'widgetsCollectionService', [ '$rootScope', '$q', '$timeout', 'settingsService', 'eventsService', function ( $rootScope, $q, $timeout, settingsService, eventsService ){
		var
			collections = {},
			COLLECTION_STARRED = 'starred',
			COLLECTION_RECENT = 'recent',
			widgetsCollectionService = {};
		widgetsCollectionService.COLLECTION_STARRED = COLLECTION_STARRED;
		widgetsCollectionService.COLLECTION_RECENT = COLLECTION_RECENT;

		widgetsCollectionService.isInCollection = function ( collectionName, widget ){
			return ( collections[ collectionName ] && collections[ collectionName ].has( widget ) );
		}
		widgetsCollectionService.addToCollection = function ( collectionName, widget, options ){
			if ( collections[ collectionName ] ){
				collections[ collectionName ].add( widget, options );
			}
		}
		widgetsCollectionService.updateCollection = function ( collectionName, widgets ){
			if ( collections[ collectionName ] ){
				collections[ collectionName ].update( widgets );
			}
		}
		widgetsCollectionService.removeFromCollection = function ( collectionName, widget, options ){
			if ( collections[ collectionName ] ){
				collections[ collectionName ].remove( widget, options );
			}
		}

		widgetsCollectionService.toggleInCollection = function ( collectionName, widget, state, options ){
			if ( collections[ collectionName ] ){
				collections[ collectionName ].toggle( widget, state, options );
			}
		}

		widgetsCollectionService.getCollectionItems = function ( collectionName ){
			if ( collections[ collectionName ] ){
				return collections[ collectionName ].getItems();
			}
		}

		widgetsCollectionService.getCollectionItemsAsObjects = function ( collectionName ){
			if ( collections[ collectionName ] ){
				return collections[ collectionName ].getItemsAsObjects();
			}
		}

		if ( $rootScope.CONFIG && $rootScope.CONFIG.recentFolder ){
			collections[ COLLECTION_RECENT ] = WidgetsCollection( {
				name       : COLLECTION_RECENT,
				maxSize    : 30,
				forceRenew : true,
				public     : true
			} );

			$rootScope.$on( 'workspace:addWidget', function ( event, widgetData ){
				if ( widgetData && widgetData.id ){
					widgetsCollectionService.addToCollection( COLLECTION_RECENT, widgetData );
				}
			} );
		}

		collections[ COLLECTION_STARRED ] = WidgetsCollection( {
			name   : COLLECTION_STARRED,
			public : true
		} );

		widgetsCollectionService.init = function (){
			var promises = [];
			angular.forEach( [ COLLECTION_RECENT, COLLECTION_STARRED ], function ( item ){
				if ( collections[item] ){
					promises.push( collections[item].load() );
				}
			} )
			return $q.all( promises );
		}


		function WidgetsCollection( data ){
			var
				_data = angular.extend( {
					public            : false,
					sort              : 'desc',
					maxSize           : 100,
					forceRenew        : false,
					deleteOnLoadError : true
				}, data ),
				saveTimer,
				saveDelay = 200,
				widgets = [],
				widgetsRegistry = {},
				widgetsAsObjects = [],
				instance = {};

			if ( ! _data.name ){
				throw new Error( 'Cannot create widget collections without name' );
			}


			function getSettingsUrl(){
				return _data.public
					? '//CUR_BC/collection/' + _data.name
					: '//CUR_USER_BC/collection/' + _data.name;
			}

			instance.load = function (){
				return settingsService.load( getSettingsUrl() )
					.then( function ( res ){
						instance.update( res );
					} );
			}


			instance.save = function ( force ){
				if ( saveTimer ){
					$timeout.cancel( saveTimer );
				}
				if ( force !== true ){
					saveTimer = $timeout( _.partial( instance.save, true ), saveDelay );
					return;
				}
				return settingsService.save(
					getSettingsUrl(),
					widgets,
					{ public : _data.public }
				);
			}

			instance.has = function ( widget ){
				if ( angular.isObject( widget ) ){
					return widget.id in widgetsRegistry;
				}
				return widget in widgetsRegistry;
			}

			instance.add = function ( widget, options ){
				var
					id = widget.id || widget,
					_options = angular.extend( {}, options || {} );
				if ( ! id ){
					return;
				}
				if ( id in widgetsRegistry ){
					if ( _data.forceRenew ){
						instance.remove( id, { quite : true } );
					}
					else {
						return;
					}
				}
				if ( _data.sort == 'desc' ){
					widgets.unshift( id );
					widgetsAsObjects.unshift( { id : id } );
				}
				else {
					widgets.push( id );
					widgetsAsObjects.push( { id : id } );
				}
				widgetsRegistry[id] = true;

				if ( _data.maxSize && widgets.length > _data.maxSize ){
					instance.remove( widgets[ widgets.length - 1 ], { quite : true } );
				}

				if ( ! _options.quite ){
					instance.save();
				}
			}

			instance.remove = function ( widget, options ){
				var
					id = widget.id || widget,
					_options = angular.extend( {}, options || {} ),
					index;
				if ( ! id || ! ( id in widgetsRegistry ) ){
					return;
				}
				delete widgetsRegistry[id];
				index = _.indexOf( widgets, id );
				if ( index > - 1 ){
					widgets.splice( index, 1 );
					widgetsAsObjects.splice( index, 1 )
				}
				if ( ! _options.quite ){
					instance.save();
				}
			}

			instance.toggle = function ( widget, state, options ){
				if ( ! angular.isDefined( state ) ){
					state = ! instance.has( widget );
				}
				if ( state ){
					instance.add( widget, options );
				}
				else {
					instance.remove( widget, options );
				}
			}

			instance.getItems = function (){
				return widgets;
			}

			instance.getItemsAsObjects = function (){
				return widgetsAsObjects;
			}

			instance.clear = function (){
				widgets.length = 0;
				widgetsRegistry = {};
				widgetsAsObjects.length = 0;
			}

			instance.update = function ( newWidgets ){
				instance.clear();
				if ( angular.isArray( newWidgets ) ){
					angular.forEach( newWidgets, function ( id ){
						widgets.push( id );
						widgetsRegistry[id] = true;
						widgetsAsObjects.push( { id : id } );
					} );
					widgets = newWidgets;
				}
			}

			$rootScope.$on( 'widgetDeleted', function ( event, eventData ){
				if ( eventData && eventData.widget && eventData.widget.id ){
					instance.remove( eventData.widget );
				}
			} );

			if ( _data.deleteOnLoadError ){
				$rootScope.$on( 'widgetLoadError', function ( event, eventData ){
					if ( eventData && eventData.widget && eventData.widget.id && instance.has( eventData.widget ) ){
						instance.remove( eventData.widget );
					}
				} );
			}

			return instance;
		}

		eventsService.on( eventsService.EVENTS.SETTING_CHANGED, function ( event, collectionData, user, key ){
			var
				pattern = new RegExp( '^' + settingsService.encodeKey( '//CUR_BC/collection/' ).replace( /^\/settings\//, '') + '(.+)$' ),
				m, collection
			if ( key && ( m = key.match( pattern ) ) && m[1] ){
				widgetsCollectionService.updateCollection( m[1], collectionData )
			}
		})

		return widgetsCollectionService;
	} ] );