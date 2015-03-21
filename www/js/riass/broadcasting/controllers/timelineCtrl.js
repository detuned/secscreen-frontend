angular.module( 'riass.broadcasting' )
	.controller( 'TimelineCtrl', [ '$scope', '$rootScope', '$document', '$timeout', 'timelineService', 'widgetService', 'CONST', function ( $scope, $rootScope, $document, $timeout, timelineService, widgetService, CONST ){
		$scope.widgetsViewMap = {};

		$scope.widgetsViewMap[timelineService.CONST.ZOOM_LEVEL_IN] = CONST.WIDGET_VIEW_SMALL;
		$scope.widgetsViewMap[timelineService.CONST.ZOOM_LEVEL_OUT] = CONST.WIDGET_VIEW_MINI;

		/* TODO */
		$scope.TIMELINE_CONST = timelineService.CONST;
		$scope.zoomLevel = timelineService.CONST.ZOOM_LEVEL_IN;
		$scope.needCentering = false;
		$scope.zoomButtons = [
			{
				type : 'center',
				title : 'To begining'
			},
			{
				type : 'zoom-in',
				title : 'Zoom in',
				zoomLevel : timelineService.CONST.ZOOM_LEVEL_IN
			},
			{
				type : 'zoom-out',
				title : 'Zoom out',
				zoomLevel : timelineService.CONST.ZOOM_LEVEL_OUT
			}
		];
		$scope.zoomAction = function ( data ){
			if ( angular.isDefined( data.zoomLevel ) ){
				$scope.zoomLevel = data.zoomLevel;
			}
			if ( data.type == 'center' ){
				$scope.needCentering = true;
			}
		}
		$scope.state = timelineService.state;
		$scope.getPublishedNum = function (){
		    return timelineService.widgetsPublished.length;
		};

		/* Processing last time publication  */
		(function(){
			var
				lastTimePublicationMoment,
				updateTimer,
				warningDiff = $rootScope.CONFIG && $rootScope.CONFIG.publicationPauseWarning
					? $rootScope.CONFIG.publicationPauseWarning
					: null;

			$scope.timeFromLastPublication = '';
			$scope.publicationPauseWarning = false;

		    function update(){
			    if ( updateTimer ){
				    $timeout.cancel( updateTimer );
			    }
			    if ( ! lastTimePublicationMoment ){
				    $scope.timeFromLastPublication = '';
				    $scope.publicationPauseWarning = false;
				    return;
			    }
			    var
				    diff, now, h, m, s,
				    res = [];
			    now = moment();
			    diff = now.diff( lastTimePublicationMoment, 'seconds' );
			    h = Math.floor( diff / 3600 );
			    m = Math.floor( ( diff - h * 3600 ) / 60 );
			    s = ( diff - h * 3600 - m * 60 );
			    if ( h > 0 ){
				    res.push( _.str.pad( h, '2', '0' ) );
			    }
			    res.push(
				    _.str.pad( m, '2', '0' ),
				    _.str.pad( s, '2', '0' )
			    );
			    $scope.timeFromLastPublication = res.join( ':' );
			    $scope.publicationPauseWarning = ! ! ( warningDiff && diff >= warningDiff );
			    updateTimer = $timeout( update, 1000 );
		    }

			$scope.$watch(function (){
			    return $rootScope.broadcasting && $rootScope.broadcasting.status == CONST.BROADCASTING_STATUS_ON
					? timelineService.lastPublicationDate
			        : null;
			}, function ( v ){
				lastTimePublicationMoment = v
					? moment( v )
					: null;
				update();
			})
		})();
		$scope.widgets = timelineService.getWidgets();
		timelineService.whenReady().then(function (){
			$timeout(function (){
				$scope.needCentering = 'quite';
			}, 400);
		})

		$scope.isWidgetDroppable = function ( eventData ){
			/* Disable already published widgets to be placed in timeline */
			return ! timelineService.state.disabled && ! eventData.widget.isPublished
		}

		$scope.removeWidgetFromTimeline = function ( widgetData ){
			var widget;
			if ( ! widgetData || ! widgetData.id ){
				return;
			}
			timelineService.removeWidget( { id : widgetData.id }, { unPreload : false } );
			widget = widgetService.getWidget({ id : widgetData.id });
			widget.whenLoaded().then(function (){
				widget.unPreload().then(function (){
					widget.selfDelete();
				}, function (){
				})
			})
		}


		/**
		 * Fires when widget is loaded and checks it status
		 * If widget is published — it means something went wrong and we need to skip it
		 * @param widget
		 */
		$scope.onUnpublishedWidgetLoaded = function ( widget ){
			if ( widget && widget.isPublished ){
				timelineService.removeWidget( { id : widget.id }, {
					unPreload : false,
					quite : true
				} )
			}
		}


		$rootScope.$on( 'removeWidgetFromTimeline', function ( event, eventData ){
			var widgetData = eventData.widget;
			if ( ! widgetData || ! widgetData.id ){
				return;
			}
			timelineService.removeWidget( { id : widgetData.id },
				{
					shift : true,
					unPreload : false,
					quite : ! ! eventData.quite
				}
			);
		} );

		$rootScope.$on( 'widgetPublished', function ( event, eventData ){
			var widget = eventData.widget;
			timelineService.addNewPublishedWidget( widget );
			timelineService.removeWidget( { id : widget.id },
				{
					shift : true,
					unPreload : false,
					quite : eventData.fromOutside
				}
			);
			if (  eventData.fromOutside ){
				return;
			}
				timelineService.updateLastPublicationDate();
			if ( ! $scope.$$phase ){
				$scope.$apply();
			}
			$scope.needCentering = true;
		});

	}]);