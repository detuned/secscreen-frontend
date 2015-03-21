angular.module( 'riass.broadcasting' )
	.service( 'timelineService', [ '$q', '$http', '$timeout', '$rootScope', 'utilsService', 'widgetService', 'settingsService', 'CONST', 'eventsService', 'broadcastingService', function ( $q, $http, $timeout, $rootScope, utilsService, widgetService, settingsService, CONST, eventsService, broadcastingService ){
		var
			_state = {
				loading      : true,
				bootstraping : true,
				disabled     : false
			},
			_settingsKeyUnpublished = '//CUR_BC/timeline/unpublished',
			_settingsKeyStatistics = '//CUR_BC/timeline/statistics',
			_widgetsPublished = [],
			_widgetsNotPublished = [],
			_allWidgets = {
				published    : _widgetsPublished,
				notPublished : _widgetsNotPublished
			},
			_readyDefer = $q.defer(),
			_lastPublicationDate,
			timelineService = {
				get lastPublicationDate(){
					return _lastPublicationDate;
				},
				state               : _state,
				widgetsPublished    : _widgetsPublished,
				widgetsNotPublished : _widgetsNotPublished,
				whenReady           : function (){
					return _readyDefer.promise;
				}
			};

		timelineService.CONST = {
			'ZOOM_LEVEL_IN'  : 0,
			'ZOOM_LEVEL_OUT' : 1
		};

		timelineService.getWidgetSize = function ( zoomLevel ){
			var sizes = {};
			sizes[ timelineService.CONST.ZOOM_LEVEL_IN ] = CONST.WIDGET_SIZE_SMALL;
			sizes[ timelineService.CONST.ZOOM_LEVEL_OUT ] = CONST.WIDGET_SIZE_MINI;
			return sizes[ zoomLevel ]
		}


		timelineService.getWidgets = function (){
			return _allWidgets;
		}

		function loadPublishedWidgets(){
			return widgetService.getPublishedWidgets( { limit : 1000 } ).then( function ( widgetsData ){
				_widgetsPublished.length = 0;
				angular.forEach( widgetsData.widgets, function ( widget ){
					_widgetsPublished.push( widget );
				} );
				return _widgetsPublished;
			} );
		}

		function applyNotPublishedWidgets( widgets ){
			_widgetsNotPublished.length = 0;
			if ( angular.isArray( widgets ) ){
				angular.forEach( widgets, function ( widget ){
					if ( widget.id ){
						_widgetsNotPublished.push( widget )
					}
				} );
			}
		}

		function loadNotPublishedWidgets(){
			var defer = $q.defer();
			settingsService.load( _settingsKeyUnpublished ).then( function ( loadedData ){
				if ( loadedData ){
					applyNotPublishedWidgets( loadedData.widgets );
				}
				defer.resolve( _widgetsNotPublished );
			}, defer.reject );
			return defer.promise;
		}

		function saveNotPublishedWidgets(){
			_state.loading = true;
			return settingsService
				.save( _settingsKeyUnpublished, { widgets : _widgetsNotPublished }, { public : true } )
				.finally( function (){
					_state.loading = false;
				} );
		}

		function saveStatistics(){
			return settingsService
				.save( _settingsKeyStatistics, {
					lastPublication : _lastPublicationDate
						? _lastPublicationDate.getTime()
						: null
				}, { public : true } );
		}


		function applyNewStatistics( statistics ){
			if ( statistics && statistics.lastPublication ){
				_lastPublicationDate = new Date( Math.min( statistics.lastPublication, ( new Date ).getTime() ) );
			}
		}

		timelineService.loadWidgets = function (){
			var defer = $q.defer();
			_state.loading = true;

			function completeLoadingWidget(){
				_state.loading = false;
				timelineService.updateWidgetPositions( { quite : true } );
			}

			broadcastingService.getActiveBroadcasting().then( function ( bc ){

				if ( bc.is_service ){
					defer.resolve( _allWidgets );
					_state.disabled = true;
					completeLoadingWidget();
					return;
				}
				_state.disabled = false;
				utilsService.PromisesCollector()
					.add( loadPublishedWidgets() )
					.add( loadNotPublishedWidgets() )
					.run()
					.then( function (){
						defer.resolve( _allWidgets );
					}, defer.reject )
					.finally( completeLoadingWidget );
			}, function (){
				defer.reject( new Error( 'Cannot load timeline widgets because cannot load active broadcasting' ) );
			} )

			return defer.promise
		}

		timelineService.init = function (){
			settingsService.load( _settingsKeyStatistics ).then( applyNewStatistics );
			return timelineService.loadWidgets()
				.then(
					_readyDefer.resolve,
					_readyDefer.reject
				)
				.finally( function (){
					_state.bootstraping = false;
				} );
		}

		/**
		 * Places given widget to specified position
		 * If this widget is not in the timeline yet it will be added previously
		 * @param widget
		 * @param newPosition
		 */
		timelineService.setWidgetPosition = function ( widget, newPosition ){
			var
				widgetData = _.find( _widgetsNotPublished, function ( w, index ){
					return w.id && ( w.id == widget.id );
				} ),
				isNew;
			if ( ! widgetData ){
				timelineService.addNewUnpublishedWidget( widget, newPosition );
				return;
			}
			widgetData.left = newPosition;
			timelineService.updateWidgetPositions();
		}

		timelineService.addNewUnpublishedWidget = function ( widget, position ){
			if ( ! widget.isPublished && ! widget.isPreloaded ){
				widget.preloadClone().then( function ( preloadedClone ){
					_widgetsNotPublished.push( { id : preloadedClone.id, left : position } );
					timelineService.updateWidgetPositions( { quite : true } );
					saveNotPublishedWidgets();
				} );
			}
		}

		timelineService.updateWidgetPositions = function ( options ){
			var
				_options = angular.extend( { quite : false }, options || {} ),
				minDistanceBetweenWidgets = 0.1,
				totalLeft = 0,
				hasChanges;
			_widgetsNotPublished.sort( function ( a, b ){
				return a.left - b.left;
			} );

			angular.forEach( _widgetsNotPublished, function ( widgetData, index ){
				widgetData.left = Math.max( 0, widgetData.left );
				if ( widgetData.left < totalLeft ){
					widgetData.left = totalLeft;
					hasChanges = true;
				}
				totalLeft = widgetData.left + 1 + minDistanceBetweenWidgets; // Adding widget's width
			} );
			if ( ! _options.quite/* && hasChanges*/ ){
				saveNotPublishedWidgets();
			}
		}

		timelineService.hasWidget = function ( widget ){
			return ! ! _.find( _widgetsNotPublished, function ( w ){
				return w.id && ( w.id == widget.id );
			} )
		}

		timelineService.removeWidget = function ( widgetData, options ){
			var
				_options = angular.extend( {
					unPreload : true,
					shift     : false
				}, options || {} ),
				widget,
				widgetIndex;
			widgetData = _.find( _widgetsNotPublished, function ( w, index ){
				widgetIndex = index;
				return w.id && ( w.id == widgetData.id );
			} );
			if ( widgetData ){
				_widgetsNotPublished.splice( widgetIndex, 1 );
				if ( _options.unPreload ){
					widget = widgetService.getWidget( { id : widgetData.id } );
					widget.whenLoaded().then( function (){
						if ( widget.isPreloaded ){
							widget.unPreload();
						}
					} );
				}
				if ( _options.shift ){
					for ( var i = widgetIndex; i < _widgetsNotPublished.length; i ++ ){
						_widgetsNotPublished[ i ].left --;
					}
				}
				timelineService.updateWidgetPositions( { quite : true } );
				if ( ! _options.quite ){
					saveNotPublishedWidgets();
				}
			}
		}

		timelineService.addNewPublishedWidget = function ( widget ){
			if ( widget && widget.id ){
				_widgetsPublished.push( { id : widget.id } );
			}
		}

		timelineService.updateLastPublicationDate = function (){
			_lastPublicationDate = new Date();
			saveStatistics();
		}

		eventsService.on( eventsService.EVENTS.SETTING_CHANGED, function ( event, unpublishedData ){
			if ( unpublishedData && unpublishedData.widgets ){
				applyNotPublishedWidgets( unpublishedData.widgets );
			}
		}, { key : _settingsKeyUnpublished } );

		eventsService.on( eventsService.EVENTS.SETTING_CHANGED, function ( event, statistics ){
			applyNewStatistics( statistics );
		}, { key : _settingsKeyStatistics } );

		return timelineService;
	} ] );