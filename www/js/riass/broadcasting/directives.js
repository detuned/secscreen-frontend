angular.module( 'riass.broadcasting' )
	.directive( 'include', [ '$rootScope', function ( $rootScope ) {
		return {
			restrict    : 'E',
			replace     : true,
			templateUrl : function ( tElement, tAttrs ) {
				return $rootScope.__getUrl( '//APP/broadcasting/views/' + tAttrs.name + '.html' )
			}
		}
	}] )
	.directive( 'layout', [ '$window', '$rootScope', function ( $window, $rootScope ) {
		var windowElement = angular.element( $window );
		return {
			restrict   : 'E',
			replace    : true,
			transclude : true,
			template   : '<div class="layout" data-ng-transclude></div>',
			controller : [ '$scope', '$element', '$attrs', function ( $scope, $element, $attrs ) {
				function triggerUpdate() {
					$rootScope.$emit( 'layoutPanelsUpdate', {
						width  : $element.width(),
						height : $element.height()
					} )
				}

				$rootScope.$on( 'layoutUpdate', triggerUpdate );
				windowElement.on( 'resize', triggerUpdate );
			}]
		}
	}] )
	.directive( 'panel', [ '$rootScope', '$timeout', 'CONST', 'layoutService', function ( $rootScope, $timeout, CONST, layoutService ) {

		var initDelayTimer;

		/**
		 * Triggers global event about panel is ready (but not too often)
		 * Useful to recount whole layout
		 * @param force
		 */
		function triggerPanelInit( force ) {
			if ( !force ) {
				if ( initDelayTimer ) {
					$timeout.cancel( initDelayTimer );
				}
				initDelayTimer = $timeout( function () {
					triggerPanelInit( true );
				}, 50 );
				return;
			}
			$rootScope.$emit( 'layoutPanelInit' );
		}

		return {
			restrict    : 'E',
			replace     : true,
			transclude  : true,
			scope       : {
				name : '@'
			},
			templateUrl : $rootScope.__getUrl( '//APP/broadcasting/views/panel.html' ),
			controller  : [ '$scope', '$element', '$attrs', function ( $scope, $element, $attrs ) {
				var stateClasses = {};
				stateClasses[ CONST.LAYOUT_PANEL_STATE_MAX ] = 'max';
				stateClasses[ CONST.LAYOUT_PANEL_STATE_MIN ] = 'min';
				stateClasses[ 'fullscreen' ] = 'fullscreen';
				$scope.buttons = [
					{
						type  : 'fullscreen',
						state : 'fullscreen',
						title : 'Fullscreen'
					},
					{
						type  : 'max',
						state : CONST.LAYOUT_PANEL_STATE_MAX,
						title : 'Maximize'
					}
				];
				$scope.panel = layoutService.getPanel( $attrs.name );
				$scope.getPanelClass = function () {
					var res = [
						'panel__' + $scope.name,
						'panel__type_' + ( $scope.panel.type == CONST.LAYOUT_PANEL_TYPE_VER ? 'ver' : 'hor' ),
						'panel__fullscreen-' + ( $scope.panel.isFullScreenAvailable ? 'allow' : 'disallow' ),
						'panel__state_' + stateClasses[ $scope.panel.state ]
					];
					if ( $scope.panel.isFullScreen ) {
						res.push( 'is-fullscreen' );
					}
					return res;
				}
				$scope.setPanelState = function ( state ) {
					if ( state == 'fullscreen' ) {
						$scope.panel.toggleFullScreen();
					}
					else if ( state == CONST.LAYOUT_PANEL_STATE_MAX && state == $scope.panel.state){
						$scope.panel.state = CONST.LAYOUT_PANEL_STATE_MIN;
					}
					else {

						$scope.panel.state = state;
					}
				}
				function updateLayout( size ) {
					var css = {
						top    : $scope.panel.countTop( size.height ),
						height : $scope.panel.countHeight( size.height ),
						left   : $scope.panel.countLeft( size.width ),
						width  : $scope.panel.countWidth( size.width )
					};
					$element.css( css )
				}

				$rootScope.$on( 'layoutPanelsUpdate', function ( event, eventData ) {
					updateLayout( eventData )
				} );
				triggerPanelInit();
			}]
		}
	}] )
	.directive( 'panelButtons', [ function () {
		return {
			restrict   : 'E',
			replace    : true,
			transclude : true,
			template   : '<span class="panel_buttons" data-ng-class="[\'panel_buttons__\' + attrs.family, \'panel_buttons__separate_\' + attrs.separate]" data-ng-transclude></span>',
			controller : [ '$scope', '$attrs', function ( $scope, $attrs ) {
				$scope.attrs = $attrs;
			}]
		}
	}] )
	.directive( 'panelButton', [ function () {
		return {
			restrict   : 'E',
			replace    : true,
			template   : '<span class="panel_button" data-ng-class="getClass()" title="">' +
				'<span class="icon panel_button_icon" data-ng-class="getIconClass()"></span>' +
				'<span class="panel_button_text" data-ng-bind="attrs.text"></span>' +
				'</span>',
			controller : [ '$scope', '$element', '$attrs', function ( $scope, $element, $attrs ) {
				$scope.attrs = $attrs;
				$scope.getClass = function () {
					var res = [ 'panel_button__' + $attrs.type ];
					if ( $scope.$eval( $attrs.isActive ) ) {
						res.push( 'is-active' );
					}
					if ( $scope.$eval( $attrs.isClickableActive ) ) {
						res.push( 'is-clickable-active' );
					}
					if ( $scope.$eval( $attrs.isAccent ) ) {
						res.push( 'panel_button__accent' );
					}
					if ( $attrs.view ) {
						res.push( 'panel_button__' + $attrs.view );
					}
					if ( 'opaque' in $attrs ) {
						res.push( 'panel_button__opaque' );
					}
					return res;
				}
				$scope.getIconClass = function () {
					return [ 'icon__', $attrs.family, '-', $attrs.type ].join( '' );
				}
			} ]
		}
	}] )
	.directive( 'panelExtHeader', [ function () {
		return {
			restrict   : 'E',
			replace    : true,
			transclude : true,
			template   : '<div class="panel_ext-header" data-ng-transclude></div>'
		}
	}] )
	.directive( 'widgetPreview', [ '$compile', '$timeout', '$document', '$compile', '$rootScope', 'CONST', 'widgetService', function ( $compile, $timeout, $document, $compile, $rootScope, CONST, widgetService ) {
		var isWidgetDragging = false;
		return {
			restrict    : 'E',
			replace     : true,
			templateUrl : $rootScope.__getUrl( '//APP/broadcasting/views/widgetPreview.html' ),
			link        : function ( scope, elem, attrs ) {

				scope.isHover = true;
				scope.view = CONST.WIDGET_VIEW_MINI;
				scope.$watch( attrs.view, function ( v ) {
					scope.view = v;
				} );

				/* Handling widget hover */
				(function () {
//					return;
					var
						widgetElem = elem,
						hoverElem,
						hoverParentElem = $document.find( 'body' ),
						offsetLeft = 20,
						offsetTop = 20,
						isShown = false,
						showTimer,
						showDelay = 50,
						resetShowTimer = function () {
							if ( showTimer ) {
								$timeout.cancel( showTimer );
							}
						}
					elem
						.on( 'mouseover', function () {
							if ( !isWidgetDragging ) {
								resetShowTimer();
								showTimer = $timeout( show, showDelay );
							}
						} )
						.on( 'mouseleave', hide );

					if ( 'loaded' in attrs ){
						scope.onWidgetLoaded = function ( widget ){
							scope.$eval( attrs.loaded )( widget );
						}
					}

					function show() {
						resetShowTimer();
						if ( isShown || isWidgetDragging ) {
							return;
						}

						if ( !hoverElem ) {
							hoverElem = angular.element( '<div class="widget-hover"></div>' )
								.on( 'mouseover', show )
								.on( 'mouseleave', hide )
								.html( '<widget-preview-hover data-id="' + scope.widget.id + '" data-view="' + scope.view + '"></widget-preview-hover>' );
							scope.isWidgetDeletable = ! ! attrs.delete;
							scope.onWidgetDelete = function (){
								if ( attrs.delete ){
									scope.$eval( attrs.delete );
									hide();
								}
							}
							$compile( hoverElem.contents() )( scope );
							hoverElem
								.draggable( {
									handle         : '.widget_dragger',
									revert         : 'invalid',
									revertDuration : 150,
									scroll         : false,
									refreshPositions : true,
									start          : function ( event, ui ) {
										widgetElem.addClass( 'is-dragging' );
										hoverElem.addClass( 'is-dragging-helper' );
										isWidgetDragging = true;
										scope.$emit( 'widgetStartDragging', { widget : scope.widget, zone : attrs.zone } );
									},
									stop           : function ( event, ui ) {
										$timeout( function () {
											widgetElem.removeClass( 'is-dragging' );
											if ( hoverElem ){
												hoverElem.removeClass( 'is-dragging-helper' ).hide();
											}
											$timeout( function () {
												isWidgetDragging = false;
												hide();
											}, 200 )
										}, 150 )
										scope.$emit( 'widgetStopDragging', { widget : scope.widget, zone : attrs.zone } );
									},
									drag : function ( event, ui ){
										scope.$emit( 'widgetDragging', { widget : scope.widget, ui : ui } );
									}
								} )
								.appendTo( hoverParentElem );
						}
						place();
						hoverElem.addClass( 'is-active' );
						hoverParentElem.addClass( 'is-widget-preview-hovered is-widget-preview-hovered__zone-' + attrs.zone );
						isShown = true;
					}

					function hide() {
						resetShowTimer();
						if ( !isShown || isWidgetDragging ) {
							return;
						}
						if ( hoverElem ) {
							hoverElem.removeClass( 'is-active' );
							$timeout( function () {
								if ( !isShown && hoverElem ) {
									hoverElem.remove();
									hoverElem = null;
								}
							}, 300 );
						}
						hoverParentElem.removeClass( 'is-widget-preview-hovered is-widget-preview-hovered__zone-' + attrs.zone );
						isShown = false;
					}

					function place() {
						var
							widgetPos = widgetElem.offset(),
							widgetWidth = widgetElem.outerWidth(),
							widgetHeight = widgetElem.outerHeight();

						hoverElem.css( {
							position  : 'absolute',
							top       : widgetPos.top - offsetTop,
							left      : widgetPos.left - offsetLeft,
							width     : widgetWidth + offsetLeft * 2,
							minHeight : widgetHeight + offsetTop * 2
						} );

					}
				})();
			}
		}
	}] )
	.directive( 'widgetPreviewHover', [ '$rootScope', function ( $rootScope ) {
		return {
			restrict    : 'E',
			replace     : true,
			templateUrl : $rootScope.__getUrl( '//APP/broadcasting/views/widgetPreview.html' ),
			link        : function ( scope, elem, attrs ) {
			}
		}
	}] )
	.directive( 'widgetView', [ '$rootScope', '$compile', 'CONST', 'widgetService', function ( $rootScope, $compile, CONST, widgetService ) {
		return {
			restrict   : 'E',
			replace    : true,
			scope      : {},
			template   : '<div class="widget-view" data-ng-class="\'widget-type__\' + widget.type"><div class="widget_display widget_display__view"></div></div>',
			controller : [ '$scope', '$element', '$attrs', function ( $scope, $element, $attrs ) {
				var viewElement = $element.find( '.widget_display' );
				$scope.widget = widgetService.getWidget( $scope.$eval( $attrs.id ) );
				$scope.widget.whenLoaded().then( function () {
					$scope.$on( 'widgetTypeDisplayReady', function ( event ) {
						event.stopPropagation();
						$scope.$emit( 'widgetViewReady', { widget : $scope.widget } );
					} );
					viewElement.html( '<widget-type-display data-type="' + $scope.widget.type + '" data-view="' + ( $attrs.view || 'full' ) + '"></widget-type-display>' );
					$scope.CONST = CONST;
					$compile( viewElement.contents() )( $scope );
				} )
			} ]
		}
	} ] )
	.directive( 'widgetText', [ '$rootScope', '$compile', 'CONST', 'widgetService', function ( $rootScope, $compile, CONST, widgetService ) {
		return {
			restrict   : 'E',
			replace    : true,
			template   : '<div class="widget"><div class="widget_view"></div></div>',
			controller : [ '$scope', '$element', '$attrs', function ( $scope, $element, $attrs ) {
				var viewElement = $element.find( '.widget_view' );
				$scope.widgetText = widgetService.getWidget( $scope.$eval( $attrs.id ) );
				$scope.widgetText.whenLoaded().then( function () {
					viewElement.html( '<widget-type-display data-type="' + $scope.widgetText.type + '" data-view="text"></widget-type-display>' );
					$compile( viewElement.contents() )( $scope );
				} )
			} ]
		}
	} ] )
	.directive( 'widgetTypeDisplay', [ '$rootScope', 'CONST', 'widgetService', function ( $rootScope, CONST, widgetService ) {
		return {
			restrict    : 'E',
			replace     : true,
			templateUrl : function ( tElement, tAttrs ) {
				if ( tAttrs.type ) {
					return $rootScope.__getUrl( '//APP/broadcasting/widgets/' + tAttrs.type + '/' + tAttrs.view + '.html' );
				}
			},
			link        : function ( scope ) {
				scope.$emit( 'widgetTypeDisplayReady', { widget : scope.widget } );
			}
		}
	}] )
	.directive( 'widgetDroppableZone', [ '$rootScope', function ( $rootScope ) {
		return function ( scope, element, attrs ) {
			var
				isDroppable,
				onDrop,
				isActive,
				data = {};
			if ( attrs.widgetDroppableZone ) {
				angular.extend( data, scope.$eval( attrs.widgetDroppableZone ) || {} );
			}
			onDrop = data.onDrop
				? scope.$eval( data.onDrop )
				: scope.addWidgetByDrop || function () {};
			$rootScope.$on( 'widgetStartDragging', function ( event, eventData ) {
				var
					widget = eventData.widget,
					zoneFrom = eventData.zone;
				isDroppable = data.checkDroppable
					? scope.$eval( data.checkDroppable )
					: scope.isWidgetDroppable || function () { return true };
				if ( isDroppable( eventData ) ) {
					isActive = true;
					element.droppable( {
						activeClass : 'is-droppable',
						hoverClass  : 'is-droppable-hover',
						greedy      : true,
//						tolerance : 'touch',
						drop        : function ( event, ui ) {
							onDrop( { widget : widget, zone : data.name } );
							scope.$emit( 'widgetDropped', {
								widget     : widget,
								zoneTo     : data.name,
								zoneFrom   : zoneFrom,
								ui         : ui,
								zoneToData : attrs.widgetDroppableZoneData
									? scope.$eval( attrs.widgetDroppableZoneData )
									: {}
							} );
						}
					} )
				}
			} );
			$rootScope.$on( 'widgetStopDragging', function ( event, eventData ) {
				var widget = eventData.widget;
				if ( isActive ) {
					element.droppable( 'destroy' );
				}
				isActive = false;
			} );
		}
	}] )
	.directive( 'timelineDeleteWidgetsZone', [ 'timelineService', 'widgetService',
function ( timelineService, widgetService ) {
		return {
			restrict   : 'E',
			scope      : {},
			template   : '<div class="timeline_delete" data-widget-droppable-zone="{zone:\'timelineDelete\'}"><span class="timeline_delete_text">Remove from timeline</span><span class="icon icon__trash"></span></div>',
			replace    : true,
			controller : [ '$scope', function ( $scope ) {
				$scope.isWidgetDroppable = function ( data ) {
					return data.zone == 'timeline' && !data.widget.isPublished;
				}
				$scope.addWidgetByDrop = function ( data ) {
					var widget;
					timelineService.removeWidget( data.widget, { unPreload : false } );
					$scope.$emit( 'widgetStopDragging', { widget : data.widget, zone : 'timelineDelete' } );
					if ( data.widget && data.widget.id ){
						widget = widgetService.getWidget({ id : data.widget.id });
						widget.whenLoaded().then(function (){
							widget.unPreload().then(function (){
								widget.selfDelete();
							})
						})
					}
					if ( !$scope.$$phase ) {
						$scope.$apply();
					}
				}
			}]
		}
	} ] )
	.directive( 'timelineWidgets', [ '$rootScope', '$window', 'timelineService', function ( $rootScope, $window, timelineService ) {
		var windowElement = angular.element( $window );
		return {
			link : function ( scope, element, attrs ) {
				var
					isActive = false,
					dropZones,
					widgetSize,
					feedWrapper = element.parent(),
					feedExtContainer = element.closest( '.timeline_feed' ), //XXX oh
					lastWidget;


				/* Handling widget start dragging */
				;(function(){

					function processWidgetStartDragging( event, eventData ){
						var
							draggingWidgetData = eventData.widget,
							totalLeft = 0,
							wrapperWidth;
						/* XXX isWidgetDroppable means here the part of TimelineCtrl' scope */
						if ( scope.isWidgetDroppable( eventData ) ) {
							isActive = true;
							widgetSize = timelineService.getWidgetSize( scope.zoomLevel );
							lastWidget = scope.widgets.notPublished[ scope.widgets.notPublished.length - 1 ];
							wrapperWidth = Math.max( ( feedWrapper.width() - element.position().left ) / widgetSize, lastWidget ? lastWidget.left + 1 : 0 );
							dropZones = angular.element();

							angular.forEach( scope.widgets.notPublished, function ( widgetData, index ) {
								if ( draggingWidgetData.id == widgetData.id ) {
									return;
								}
								var
									diff = widgetData.left - totalLeft;
								if ( widgetData.left == 0 ) {
									totalLeft = -0.1;
									diff = 0.1;
								}
								addDropZone( totalLeft, diff );
								totalLeft = widgetData.left + 1;
							} );
							addDropZone( totalLeft, Math.max( 0.1, wrapperWidth - totalLeft ) );
							dropZones.appendTo( element );
						}

						function addDropZone( left, width ) {
							var
								dropZone = angular
									.element( '<div class="timeline_dropzone" data-left="' + left + '"  data-width="' + width + '"></div>' )
									.toggleClass( 'timeline_dropzone__small', width < 0.3 )
									.css( {
										left   : widgetSize * left,
										width  : widgetSize * width,
										height : widgetSize
									} )
									.droppable( {
										activeClass : 'is-droppable',
										hoverClass  : 'is-droppable-hover',
										tolerance   : 'touch',
										drop        : function ( event, ui ) {
											var
												realLandedLeft = ( ui.offset.left - element.offset().left ) / widgetSize;
											timelineService.setWidgetPosition( draggingWidgetData, realLandedLeft );
										}
									} );
							dropZones = dropZones.add( dropZone );
						}
					}

					$rootScope.$on( 'widgetStartDragging', processWidgetStartDragging );

					$rootScope.$on( 'widgetStopDragging', function () {
						if ( isActive && dropZones.length ){
							dropZones.remove();
						}
						isActive = false;
					} )
				})();



				element.css( 'minWidth', screen.width * 0.9 );
			}
		}
	} ] )
	.directive( 'timelineWidget', [ 'timelineService', function ( timelineService ) {
		return {
			link : function ( scope, element, attrs ) {
				element.addClass( 'timeline_widget' );
				var widgetData = scope.$eval( attrs.timelineWidget );
				scope.$watch( attrs.timelineWidget + '.left', place );
				scope.$watch( 'zoomLevel', place );
				function place() {
					element.css( {
						left : timelineService.getWidgetSize( scope.zoomLevel ) * widgetData.left
					} )
				}

				element.css( {
					position : 'absolute',
					top      : 0
				} )
				place( widgetData.left );
			}
		}
	} ] )
	.directive( 'timelineScrollControl', [ '$rootScope', '$timeout', 'timelineService', function ( $rootScope, $timeout, timelineService ) {
		return function ( scope, element, attrs ) {
			var
				fieldName = attrs.timelineScrollControl,
				scrollableElement = element.find( '.timeline_feed' ),
				leftWidgetsContainer = element.find( '.timeline_widgets-set__published' ),
				timelineElement = scrollableElement.find( '.timeline_line' );
			scope.$watch( fieldName, function ( v ) {
				if ( v ) {
					centering( v );
				}
			} );
			function centering( option ) {
				var
					timelinePosition = timelineElement.position().left,
					widgetToAlign = leftWidgetsContainer.find( '.widget' ).eq( -2 ),
					scrollLeft = 0;
				if ( widgetToAlign.length ) {
					scrollLeft = widgetToAlign.position().left - 10;
				}
				if ( option == 'quite' ) {
					scrollableElement.prop( { scrollLeft : scrollLeft } );
				}
				else {
					scrollableElement.animate( { scrollLeft : scrollLeft }, { duration : 300, easing : 'swing' } );
				}
				scope[ fieldName ] = false;
			}

			centering();
			;(function(){
				var
					feelZone = 50,
					scrollOffset = 15,
					animateDelay = 20,
					timer,
					offset;

				function actualizeOffset(){
					offset = scrollableElement.offset();
					offset.right = offset.left + scrollableElement.width();
					offset.bottom = offset.top + scrollableElement.height();
				}

				function animateScroll( direction ){
					cancelAnimation();
					timer = $timeout(function (){
						var scrollLeft = scrollableElement.scrollLeft();
						scrollableElement.scrollLeft( scrollLeft + direction * scrollOffset );
						if ( scrollLeft != scrollableElement.scrollLeft()){
							animateScroll( direction );
						}
					}, animateDelay);
				}

				function cancelAnimation(){
					if ( timer ){
						$timeout.cancel( timer );
					}
				}

				$rootScope.$on( 'widgetStartDragging', actualizeOffset );
				$rootScope.$on( 'widgetStopDragging', cancelAnimation );
				$rootScope.$on( 'widgetDragging', function ( event, eventData ){
					cancelAnimation();
					if ( ! offset ){
						return;
					}
					var
						ui = eventData.ui,
						widgetRight = ui.position.left + ui.helper.width(),
						widgetBottom = ui.position.top + ui.helper.height();
					if (
						widgetBottom > offset.top &&
						ui.position.top < offset.bottom
						){
						/* Vertical position matched, start analizing */

						if ( widgetRight > ( offset.right - feelZone ) ){
							/* Widget's near right side, scroll to right */
							animateScroll( 1 );
						}
						else if ( ui.position.left < feelZone ){
							/* WIdget's near left side, scroll to left */
							animateScroll( - 1 );
						}
					}
				} );

			})();
		}
	}] )
	.directive( 'workspaceContainer', [ '$rootScope', '$timeout', function ( $rootScope, $timeout ) {
		return function ( scope, element ) {
			$rootScope.$on( 'layoutUpdate', function () {
				$timeout( function () {
					element.toggleClass( 'workspace__tight', element.width() < 940 );
				}, 200 )
			} )
		}
	}] )
	.directive( 'wsWidget', [ '$compile', '$timeout', '$document', '$compile', '$rootScope', 'CONST', 'workspaceService', function ( $compile, $timeout, $document, $compile, $rootScope, CONST, workspaceService ) {
		return {
			restrict    : 'E',
			replace     : true,
			templateUrl : $rootScope.__getUrl( '//APP/broadcasting/views/workspaceWidget.html' ),
			link        : function ( scope, element, attrs ) {
				var wsWidget = scope.$eval( attrs.wsWidget );

//				scope.$watch( attrs.wsWidget + '.left', place );
//				scope.$watch( attrs.wsWidget + '.top', place );
				scope.$watch( attrs.wsWidget + '.isHighlighted', function ( v ) {
					if ( v === true ) {
						var
							top = element.parent().position().top - 20,
							scrollableElement = element.closest( '.workspace_core' );
						scrollableElement
							.animate(
							{ scrollTop : scrollableElement.scrollTop() + top },
							{ duration : 300, easing : 'swing' }
						);
					}
				} );

				function place() {
					var scale = workspaceService.getScale();
					element
						.css( {
							left : scale * wsWidget.left,
							top  : scale * wsWidget.top
						} )
						.triggerReposition();
				}

//				place();

				element.on( 'click', '.widget_attach_link', function () {
					var attachId = angular.element( this ).data( 'attachId' );
					scope.attachClick && scope.attachClick( attachId );
				} )


					/* Dragging */
				;
				(function () {
					var
						isWidgetDragging = false,
						dragZone = 'workspace';
					element.draggable( {
						handle         : '.ws-widget_dragger',
						helper         : 'clone',
						appendTo       : 'body',
						revert         : 'invalid',
						revertDuration : 150,
						scroll         : false,
						cursorAt       : {
							right : 50,
							top   : 10
						},
						start          : function ( event, ui ) {
							element.addClass( 'is-dragging' );
							isWidgetDragging = true;
							scope.$emit( 'widgetStartDragging', { widget : scope.widget, zone : dragZone } );
						},
						stop           : function ( event, ui ) {
							$timeout( function () {
								element.removeClass( 'is-dragging' );
							}, 150 )
							scope.$emit( 'widgetStopDragging', { widget : scope.widget, zone : dragZone } );
						},
						drag : function ( event, ui ){
							scope.$emit( 'widgetDragging', { widget : scope.widget, ui : ui } );
						}
					} );
				})();

			}
		}
	}] )
	.directive( 'wsWidgetFilterField', [ '$timeout', function ( $timeout ) {
		return function ( scope, element, attrs ) {
			element
				.on( 'focus', function () {
					element
						.select()
						.on( 'keydown.filterField', function ( event ) {
							if ( 40 == event.keyCode ) {
								/* Down */
								setNext( 1 )
								process();
							}
							else if ( 38 == event.keyCode ) {
								/* Up */
								setNext( - 1 );
								process();
							}
							else if ( 13 == event.keyCode ) {
								/* Enter */
								scope.createWidget();
							}
							function process() {
								event.preventDefault();
								if ( !scope.$$phase ) {
									scope.$apply();
								}
							}

							function setNext( direction ){
								var nextType;
								_.find( scope.filteredTypes, function ( type, index ){
									if ( type.typeId == scope.selectedTypeId ){
										nextType = scope.filteredTypes[ index + direction ]
											? scope.filteredTypes[ index + direction ]
											: scope.filteredTypes[
											           direction > 0
												           ? 0
												           : scope.filteredTypes.length - 1
											           ];
										return true;
									}
								} );

								if ( nextType && angular.isDefined( nextType.typeId ) ){
									scope.selectedTypeId = nextType.typeId;
								}
							}

						} );
				} )
				.on( 'blur', function () {
					element.off( '.filterField' )
				} );
			$timeout(function (){
				if( element.is( ':visible' ) ){
					element.focus();
				}
			})
		}
	}] )
	.directive( 'widgetFieldAutosave', [function () {
		return function ( scope, element, attrs ) {
			if ( attrs.ngModel ) {
				scope.$watch( attrs.ngModel, function ( v ) {
					scope.editWidgetAutoSave();
				} );
			}
		}
	}] )
	.directive( 'widgetFieldAutofocus', [ 'workspaceService', function ( workspaceService ) {
		return function ( scope, element, attrs ) {
			scope.$watch( 'wsWidget.state', function ( v ) {
				if ( v == workspaceService.STATES.EDIT ) {
					element.select();
				}
			} )
		}
	}] )
	.directive( 'widgetFieldset', [ function () {
		return {
			restrict   : 'E',
			replace    : true,
			transclude : true,
			template   : '<div class="widget_fieldset" data-ng-transclude></div>'
		}
	}] )
	.directive( 'widgetImg', [ 'imgService', 'CONST', function ( imgService, CONST ) {
		return {
			restrict   : 'E',
			scope      : {
				img  : '=',
				size : '@',
				cover : '@'
			},
			replace    : true,
			template   : '<div class="widget_img" data-ng-style="{\'background-image\':\'url(\' + ( getImgUrl( img, size ) || \'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7\') + \')\'}" data-ng-class="\'widget_img__cover-\' + cover"></div>',
			controller : [ '$scope', '$attrs', function ( $scope, $attrs ) {
				$scope.getImgUrl = ( 'small' in $attrs )
					? function ( img, size ) {
					return imgService.getImgUrl( img, size, { addUrlField : 'small_url' } );
				}
					: imgService.getImgUrl;
			}]
		}
	} ] )
	.directive( 'widgetImgField', [ '$rootScope', 'imgService', 'CONST', function ( $rootScope, imgService, CONST ) {
		return {
			restrict    : 'E',
			scope       : {
				img             : '=',
				dropId          : '@',
				change          : '=',
				size            : '@',
				defaultBaseTags : '=',
				isVisible       : '@'
			},
			replace     : true,
			templateUrl : $rootScope.__getUrl( '//APP/broadcasting/views/widgetImgField.html' ),
			controller  : [ '$scope', '$element', '$attrs', function ( $scope, $element, $attrs ) {
				var
					sources = $attrs.sources
						? $rootScope.$eval( $attrs.sources ) || []
						: [
						CONST.IMG_EXPORT_TYPE_BLITZ,
						CONST.IMG_EXPORT_TYPE_INTERNAL,
						CONST.IMG_EXPORT_TYPE_VR
					],
					defaultSource = $attrs.defaultSource
						? $rootScope.$eval( $attrs.defaultSource ) || null
						: null,
					defaultInternalTags = $attrs.defaultInternalTags
						? $rootScope.$eval( $attrs.defaultInternalTags ) || null
						: null,
					defaultTags = $attrs.defaultTags
						? $rootScope.$eval( $attrs.defaultTags ) || null
						: null;
				$scope.isBusy = false;
				$scope.isCroppable = 'croppable' in $attrs;
				$scope.getImgUrl = imgService.getImgUrl;
				$scope.chooseImg = function () {
					$scope.isBusy = true;
					imgService.chooseImg( {
						sources             : sources,
						defaultSource       : defaultSource,
						defaultInternalTags : defaultInternalTags,
						defaultTags         : angular.isArray( $scope.defaultBaseTags )
							? _.uniq( [].concat( $scope.defaultBaseTags, defaultTags || [] ) )
							: defaultTags
					} )
						.then( function ( imgObject ) {
							$scope.img = imgObject;
							triggerChange();
						} )
						.finally( function () {
							$scope.isBusy = false;
						} )
				}

				$scope.editImg = function (){
					$scope.isBusy = true;
					imgService.editImg( {
						img : $scope.img
					} )
						.then( function ( imgObject ) {
							$scope.img = imgObject;
							triggerChange();
						} )
						.finally( function () {
							$scope.isBusy = false;
						} )
				}


				$scope.isImageDroppable = function (){
					return ! ! $scope.dropId;
				}

				$rootScope.$on( 'imageDropped', function ( event, eventData ) {
					var
						droppedImage = eventData.image,
						zoneFrom = eventData.zoneFrom,
						zoneTo = eventData.zoneTo;

					if ( eventData.zoneTo == 'widgetImgField' && eventData.zoneToData.id == $scope.dropId ) {
						if ( $scope.img ){
							angular.forEach( $scope.img, function ( v, k ){
								delete $scope.img[k];
							})
							angular.extend( $scope.img, droppedImage );
						}
						else{
							$scope.img = droppedImage;
						}
						if ( ! $scope.$$phase ){
							$scope.$apply();
						}
					}
				} );


				$scope.getContainerStyle = function () {
					return $scope.isCroppable
						? {}
						: {
						'background-image' : 'url(' + $scope.getImgUrl( $scope.img, $scope.size ) + ')'
					};
				}

				if ( $scope.isCroppable ) {
					/* Handling croppable  */
					(function () {
						var
							croppableElement = $element.find( '.widget_img_cropped' ),
							picWrapperElement = croppableElement.find( '.widget_img_cropped_pic-wrapper' ),
							picHolderElement = croppableElement.find( '.widget_img_cropped_pic-holder' ),
							boundsElement = croppableElement.find( '.widget_img_cropped_pic-bounds' ),
							imgElement,
							draggable;
						croppableElement.on( 'click',
							'.widget_img_cropped_dragger, .widget_img_cropped_dragger-arrows',
							function ( event ) {
								event.stopPropagation();
								return false;
							} );

						$scope.$watch( 'img.orig_url', actualizeImgCroppable );
						$scope.$watch( 'img.url', actualizeImgCroppable );
						$scope.$watch( 'img.type', actualizeImgCroppable );
						$scope.$watch( 'isVisible', actualizeImgCroppable );

						function actualizeImgCroppable() {
							var imgUrl;
							resetCroppable();
							if ( ! $scope.img ||
							     ! ( $scope.img.url || $scope.img.orig_url ) ||
							     ! $scope.isVisible ||
							     $scope.isVisible == 'false' ) {
								/* Skip actualizing if image url is empty or if field is invisible */
								return;
							}
							/*
							 * 'edited' flag switched on means image was cropped manually
							 * Value of 'url' in this case contains cropped image and should
							 * be used to show here, while 'orig_url' is usable only if
							 * manual crop will run again
							 */
							if ( $scope.img.orig_url && ! $scope.img.edited ){
								$scope.img.url = $scope.img.orig_url;
							}
							imgUrl = $scope.getImgUrl( $scope.img, $scope.size );
							$scope.isImageLoading = true;
							imgElement = angular.element( '<img />' )
								.addClass( 'widget_img_cropped_pic' )
								.attr( 'src', imgUrl )
								.on( 'load', function () {
									handleDragging();
									$scope.isImageLoading = false;
									if ( !$scope.$$phase ) {
										$scope.$apply();
									}
								} )
								.appendTo( picHolderElement );
						}


						function handleDragging() {
							var
								frameHeight = croppableElement.height(),
								imgHeight = imgElement.height(),
								diffHeight = imgHeight - frameHeight;
							if ( diffHeight > 0 && ( $scope.img.type && $scope.img.type != CONST.IMG_EXPORT_TYPE_INTERNAL ) ) {
								/* Need to crop this huge image! */
								$scope.isDraggableToCrop = true;
								if ( !$scope.img.crop_y ) {
									/*
									 * If image is larger than possible, we _have_ to make
									 * 'crop_y' field exists.
									 * It will let the widgetService know to crop image
									 * before saving even if user will not choose crop coordinates.
									 */
									$scope.img.crop_y = 0;
								}
								picWrapperElement.css( 'top', -$scope.img.crop_y * imgHeight );
							}
							else {
								/* Image is enough small, nothing to crop */
								$scope.isDraggableToCrop = false;
								picWrapperElement.css( 'top', -diffHeight * 0.5 );
								return;
							}
							destroyDragging();
							draggable = picWrapperElement.draggable( {
								handle      : '.widget_img_cropped_dragger',
								axis        : 'y',
								scroll      : false,
								containment : boundsElement.css( {
									top    : -diffHeight,
									bottom : -diffHeight
								} ),
								stop        : function ( event, ui ) {
									$scope.img.crop_y = -ui.position.top / imgHeight;
									triggerChange();
								}
							} );

						}

						function destroyDragging() {
							if ( draggable ) {
								picWrapperElement.draggable( 'destroy' );
								draggable = null;
							}
						}

						function resetCroppable() {
							$scope.isDraggableToCrop = false;
							picHolderElement.empty();
							picWrapperElement.css( 'top', '' );
							destroyDragging();
						}

					})();
				}

				function triggerChange() {
					if ( angular.isFunction( $scope.change ) ) {
						$scope.change();
					}
				}
			}]
		}
	}] )
	.directive( 'folder', [ '$rootScope', 'folderService', function ( $rootScope, folderService ) {
		return {
			restrict    : 'E',
			replace     : true,
			templateUrl : $rootScope.__getUrl( '//APP/broadcasting/views/folder.html' ),
			link        : function ( scope, element, attrs ) {

			}
		}
	} ] )
	.directive( 'folderTypeDisplay', [ '$rootScope', function ( $rootScope ) {
		return {
			restrict    : 'E',
			replace     : true,
			templateUrl : function ( tElement, tAttrs ) {
				if ( tAttrs.type ) {
					return $rootScope.__getUrl( '//APP/broadcasting/folders/' + tAttrs.type + '/view.html' );
				}
			}
		}
	}] )
	.directive( 'folderWidgetsList', [ '$rootScope', '$window', '$document', '$timeout', 'CONST', function ( $rootScope, $window, $document, $timeout, CONST ) {
		var
			windowElement = angular.element( $window ),
			globalId = 0,
			ORIENTATION_HORIZONTAL = 'hor',
			ORIENTATION_VERTICAL = 'ver';
		return {
			restrict    : 'E',
			templateUrl : $rootScope.__getUrl( '//APP/broadcasting/views/folderWidgetsList.html' ),
			replace     : true,
			link        : function ( scope, element, attrs ) {
				var
					listElement = element.find( '.folder-widgets_core' ),
					eventFamily = '.folderWidgetsList_' + ++globalId,
					capacityTimer,
					orientation = ORIENTATION_HORIZONTAL,
					totalCapacity = 0;
				if ( 'onNotComplete' in attrs ) {
					element.on( 'scroll', function () {
						if ( element[0].scrollLeft + element[0].offsetWidth >= 0.95 * element[0].scrollWidth ) {
							triggerNotComplete()
						}
					} );
				}

				function triggerNotComplete() {
					if ( attrs.onNotComplete ) {
						scope.$eval( attrs.onNotComplete );
					}
				}

				function checkCompleteness() {
					if ( orientation == ORIENTATION_HORIZONTAL ){
						if ( element.is( ':visible' ) && listElement.width() < element.width() ) {
							triggerNotComplete()
						}
					}
					else{
						if ( element.is( ':visible' ) && ( listElement.height() < element.height() + CONST.WIDGET_SIZE_MINI ) ) {
							triggerNotComplete()
						}
					}
				}


				if ( 'reportCapacity' in attrs ) {
					windowElement.on( 'resize' + eventFamily, reportCapacity );
					$document.on( 'layoutUpdate' + eventFamily, reportCapacity )
					scope.$on( 'storage:folderRemove', function ( event, folder ) {
						if ( folder.id == scope.folder.id ) {
							windowElement.off( eventFamily );
							$document.off( eventFamily );
						}
					} );
				}

				function reportCapacity( force ) {
					capacityTimer && $timeout.cancel( capacityTimer );
					if ( force !== true ) {
						capacityTimer = $timeout( _.partial( reportCapacity, true ), 100 );
						return;
					}

					var handlers = {};
					handlers[ ORIENTATION_HORIZONTAL ] = function (){
						var
							itemWidth = CONST.WIDGET_SIZE_MINI * 1.1,
							capacity = Math.ceil( element.width() / itemWidth ) + 1;
						if ( scope.onCapacityChange ) {
							scope.onCapacityChange( capacity );
						}
						else {
							scope._folderCapacity = capacity;
						}
					}
					handlers[ ORIENTATION_VERTICAL ] = function (){
						var
							itemSize = CONST.WIDGET_SIZE_MINI * 1.1,
							capacity = 40;/*,
							capacity = ( Math.ceil(element.height() / itemSize ) + 1 ) *
							           Math.floor( element.width() / itemSize )*/;

						if ( scope.onCapacityChange ) {
							scope.onCapacityChange( capacity );
						}
						else {
							scope._folderCapacity = capacity;
						}

					}

					handlers[ orientation ] && handlers[ orientation ]();
					checkCompleteness();
				}

				function reportCapacityHorizontal(){

				}

				if ( 'orientation' in attrs ){
					attrs.$observe( 'orientation', function ( newOrientation ){
					    if( newOrientation != orientation ){
							orientation = newOrientation;
							reportCapacity( true );
					    }
					})
				}
				if ( 'totalCapacity' in attrs ){
					attrs.$observe( 'totalCapacity', function ( newTotalCapacity ){
					    if( newTotalCapacity != totalCapacity ){
						    totalCapacity = newTotalCapacity;
							reportCapacity();
					    }
					})
				}

				reportCapacity( true );
			}
		}
	}] )
	.directive( 'liveList', [ '$timeout', '$window', '$document', function ( $timeout, $window, $document ) {
		var
			globalId = 0,
			windowElement = angular.element( $window );
		return function ( scope, element, attrs ) {
			var
				capacityTimer,
				itemWidth = attrs.liveList,
				eventFamily = '.capacity_' + ++globalId,
				listElement = element.find( '>:first' );

			if ( !itemWidth || !listElement.length ) {
				return;
			}

			if ( 'onNotComplete' in attrs ) {
				element
					.on( 'scroll', function () {
						if ( element[0].scrollLeft + element[0].offsetWidth >= 0.8 * element[0].scrollWidth ) {
							triggerNotComplete()
						}
					} )
					.scrollLeft( 0 );
			}

			windowElement.on( 'resize' + eventFamily, reportCapacity );
			$document.on( 'layoutUpdate' + eventFamily, reportCapacity );

			function triggerNotComplete() {
				if ( attrs.onNotComplete ) {
					scope.$eval( attrs.onNotComplete );
				}
			}

			function checkCompleteness() {
				if ( element.is( ':visible' ) && listElement.width() < element.width() ) {
					triggerNotComplete()
				}
			}

			function reportCapacity( force ) {
				capacityTimer && $timeout.cancel( capacityTimer );
				if ( force !== true ) {
					capacityTimer = $timeout( _.partial( reportCapacity, true ), 300 );
					return;
				}
				var
					capacity = Math.ceil( element.width() / itemWidth ) + 1;
				if ( scope.onCapacityChange ) {
					scope.onCapacityChange( capacity );
				}
				else {
					scope._folderCapacity = capacity;
				}
				checkCompleteness();
			}
		}
	}] )
	.directive( 'imagePreview', [ '$rootScope', '$timeout', '$document', '$window', '$compile',
		function ( $rootScope, $timeout, $document, $window, $compile ) {
			var
				isImageDragging = false,
				windowElement = angular.element( $window );
			return {
				restrict    : 'E',
				templateUrl : $rootScope.__getUrl( '//APP/broadcasting/views/imagePreview.html' ),
				replace     : true,
				link        : function ( scope, element, attrs ) {

					scope.zone = attrs.zone;
					/* Handling feedItem's hover element */
					(function () {
						var
							imageElem = element,
							hoverElem,
							hoverParentElem = $document.find( 'body' ),
							offsetLeft = 0,
							offsetTop = 0,
							isShown = false,
							showTimer,
							showDelay = 0,
							resetShowTimer = function () {
								if ( showTimer ) {
									$timeout.cancel( showTimer );
								}
							}
						element
							.on( 'mouseover', function () {
								if ( !isImageDragging ) {
									resetShowTimer();
									showTimer = $timeout( show, showDelay );
								}
							} )
							.on( 'mouseleave', hide );

						function show() {
							resetShowTimer();
							if ( isShown || isImageDragging ) {
								return;
							}

							if ( !hoverElem ) {
								hoverElem = angular.element( '<div class="image-preview-hover"></div>' )
									.on( 'mouseover', show )
									.on( 'mouseleave', hide )
									.html( '<image-preview-hover></image-preview-hover>' );
								$compile( hoverElem.contents() )( scope );
								hoverElem
									.draggable( {
										handle         : '.image-preview_dragger',
										revert         : 'invalid',
										revertDuration : 150,
										scroll         : false,
										start          : function ( event, ui ) {
											imageElem.addClass( 'is-dragging' );
											hoverElem.addClass( 'is-dragging-helper' );
											isImageDragging = true;
											scope.$emit( 'imageStartDragging', { image : scope.image, zone : scope.zone } );
										},
										stop           : function ( event, ui ) {
											$timeout( function () {
												imageElem.removeClass( 'is-dragging' );
												hoverElem.removeClass( 'is-dragging-helper' ).hide();
												$timeout( function () {
													isImageDragging = false;
													hide();
												}, 200 )
											}, 150 )
											scope.$emit( 'imageStopDragging', { image : scope.image, zone : scope.zone } );
										}
									} )
									.appendTo( hoverParentElem );
							}
							place();
							hoverElem.addClass( 'is-active' );
							hoverParentElem.addClass( 'is-image-preview-hovered is-image-preview-hovered__zone-' + scope.zone );
							isShown = true;
						}

						function hide() {
							resetShowTimer();
							if ( !isShown || isImageDragging ) {
								return;
							}
							if ( hoverElem ) {
								hoverElem.removeClass( 'is-active' );
								$timeout( function () {
									if ( !isShown && hoverElem ) {
										hoverElem.remove();
										hoverElem = null;
									}
								}, 300 );
							}
							hoverParentElem.removeClass( 'is-image-preview-hovered is-image-preview-hovered__zone-' + scope.zone );
							isShown = false;
						}

						function place() {
							var
								imagePos = imageElem.offset();

							if ( 'simpleHover' in attrs ){
								hoverElem.css( {
									position  : 'absolute',
									top       : imagePos.top,
									left      : imagePos.left
								} );
								return;
							}

							var
								imageWidth = imageElem.outerWidth(),
								imageHeight = imageElem.outerHeight(),
								hoverWidth = hoverElem.outerWidth(),
								hoverHeight = Math.max( 150, hoverElem.outerHeight() ),

								windowWidth = windowElement.width(),
								windowHeight = windowElement.height(),

								diffWidth = Math.max( 0, hoverWidth - imageWidth ),
								diffHeight = Math.max( 0, hoverHeight - imageHeight ),

								minTop = 0,
								maxTop = windowHeight - hoverHeight,
								minLeft = 0,
								maxLeft = windowWidth - hoverWidth;


							hoverElem.css( {
								position  : 'absolute',
								top       : Math.max( minTop, Math.min( maxTop, imagePos.top - 0.5 * diffHeight - offsetTop ) ),
								left      : Math.max( minLeft, Math.min( maxLeft, imagePos.left - 0.5 * diffWidth - offsetLeft ) )
							} );

						}
					})();
				}
			}
		}] )
	.directive( 'imagePreviewHover', [ '$rootScope', function ( $rootScope ) {
		return {
			restrict    : 'E',
			replace     : true,
			templateUrl : $rootScope.__getUrl( '//APP/broadcasting/views/imagePreview.html' ),
			link        : function () {}
		}
	}] )
	.directive( 'imageDroppableZone', [ '$rootScope', function ( $rootScope ) {
		return function ( scope, element, attrs ) {
			var
				isDroppable,
				onDrop,
				isActive,
				data = {};
			if ( attrs.imageDroppableZone ) {
				angular.extend( data, scope.$eval( attrs.imageDroppableZone ) || {} );
			}
			onDrop = data.onDrop
				? scope.$eval( data.onDrop )
				: scope.addImageByDrop || function () {};
			$rootScope.$on( 'imageStartDragging', function ( event, eventData ) {
				var
					image = eventData.image,
					zoneFrom = eventData.zone;
				isDroppable = data.checkDroppable
					? scope.$eval( data.checkDroppable )
					: scope.isImageDroppable || function () { return true };
				if ( isDroppable( eventData ) ) {
					isActive = true;
					element.droppable( {
						activeClass : 'is-droppable',
						hoverClass  : 'is-droppable-hover',
						greedy      : true,
//						tolerance : 'touch',
						drop        : function ( event, ui ) {
							onDrop( { image : image, zone : data.name } );
							scope.$emit( 'imageDropped', {
								image     : image,
								zoneTo     : data.name,
								zoneFrom   : zoneFrom,
								ui         : ui,
								zoneToData : attrs.imageDroppableZoneData
									? scope.$eval( attrs.imageDroppableZoneData )
									: {}
							} );
						}
					} )
				}
			} );
			$rootScope.$on( 'imageStopDragging', function ( event, eventData ) {
				var image = eventData.image;
				if ( isActive ) {
					element.droppable( 'destroy' );
				}
				isActive = false;
			} );
		}
	}] )