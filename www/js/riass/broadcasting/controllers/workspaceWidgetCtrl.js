angular.module( 'riass.broadcasting' )
	.controller( 'WorkspaceWidgetCtrl', [ '$scope', '$rootScope', '$element', '$attrs', '$compile', '$timeout', 'workspaceService', 'dialogsService',
		function ( $scope, $rootScope, $element, $attrs, $compile, $timeout, workspaceService, dialogsService ) {
			$scope.wsWidget = $scope.$eval( $attrs.wsWidget );
			$scope.STATES = workspaceService.STATES;

			if ( $scope.wsWidget.id ){
				$scope.wsWidget.whenWidgetLinked().then(function ( widget ){
					$scope.widget = widget;

					/**
					 * Useful in type controllers
					 * @type {{widget: *, autoSave: Function, validate: Function}}
					 */
					$scope.edit = {
						widget : $scope.wsWidget.editWidget,
						/**
						 * Type widget controller should fire it when
						 * something changes in the edit.widget to autosave it
						 * on server
						 */
						autoSave : function (){
							widget.setBusy();
							workspaceService.save();
						},
						/**
						 * Type widget controller should override this method
						 * with its own to validate fields before submitting
						 * If false returned form submit will be refused
						 * @returns {boolean}
						 */
						validate : function (){
							return true;
						},

						/**
						 * Takes and saves external function to normalize editData
						 * when it's changes outside (e.g. from saved workspace state or
						 * from newly created empty widget)
						 * Useful to add normalizer by type controller to control
						 * that editData is correct in every moment
						 * @param normalizerFn
						 */
						normalizer : function ( normalizerFn ){
							$scope.wsWidget.addExternalDataNormalizer( normalizerFn );
						},

						isVisible : function (){
							return $scope.wsWidget.state == $scope.STATES.EDIT;
						}
					}

					;(function(){
					    var currTags = [].concat( $scope.edit.widget.tags || [] );
						$scope.$watchCollection( 'edit.widget.tags', function ( v, prev ){
							if ( v.length != currTags.length ){
								$scope.edit.autoSave();
								currTags = [].concat( v || [] );
							}
						} );
					})();


					;(function(){
						function renderType( state, displayView ){
							var stateElement = $element.find( '.widget_display__' + state );
							stateElement.html('<widget-type-display data-type="' + $scope.widget.type + '" data-view="' + displayView + '"></widget-type-display>');
							$compile( stateElement.contents() )($scope);
						}
						renderType( $scope.STATES.VIEW, 'full' );
						renderType( $scope.STATES.EDIT, 'edit' );
					})();


					/* Attach */
					(function(){
						var currAttach = [].concat( $scope.edit.widget.attach || [] );
						$scope.$watchCollection( 'edit.widget.attach', function ( v, prev ){
							if ( v.length != currAttach.length ){
								$scope.edit.autoSave();
								currAttach = [].concat( v || [] );
							}
						} );
						$scope.addAttach = function ( id ){
							if ( _.indexOf( $scope.edit.widget.attach, id ) < 0 ){
								// Avoid to have duplicates in attach list
								$scope.edit.widget.attach.push( id );
							}
						}
						$scope.removeAttach = function ( index ){
							$scope.edit.widget.attach.splice( index, 1 );
							if ( ! $scope.$$phase ){
								$scope.$apply();
							}
						}

						$scope.clearAttach = function ( index ){
							$scope.edit.widget.attach.length = 0;
							if ( ! $scope.$$phase ){
								$scope.$apply();
							}
						}

						$scope.isAttachable = function (){
							return $scope.edit.widget && ! $scope.edit.widget.attach.length;
						}

						$scope.attachClick = function ( attachId ){
							workspaceService.addWidget( { id : attachId }, { afterWidget : $scope.wsWidget } );
						}


					})();

					$rootScope.$on( 'widgetDropped', function ( event, eventData ) {
						var
							droppedWidget = eventData.widget,
							zoneFrom = eventData.zoneFrom,
							zoneTo = eventData.zoneTo;
						if ( eventData.zoneTo == 'widgetAttach' && eventData.zoneToData.id == widget.id ) {
							$scope.addAttach( droppedWidget.id );
						}
					} );

					/* Publishing */
					$scope.publish = function (){
						$rootScope.showWidgetPublishDialog( $scope.widget );
					}
				});
			}

			$scope.isWidgetDroppable = function ( data ){
				return $scope.wsWidget.state == $scope.STATES.EDIT &&
					$scope.widget &&
					$scope.widget.id &&
					data.widget &&
					data.widget.id &&
					$scope.widget.id != data.widget.id &&
					$scope.isAttachable &&
					$scope.isAttachable()
			}

			/* Changing state */
			;(function(){
				$scope.wsWidget.isReadyToChangeState = false;
				$scope.wsWidget.isChangingState = false;
				$scope.changeState = function ( newState ){
					if ( $scope.wsWidget.isReadyToChangeState ){
						/* State is in process of changing already */
						return;
					}
					var
						newHeight = $element.find( '.ws-widget_state__' + newState ).height();
					$scope.wsWidget.isReadyToChangeState = true;
					$element.css( 'minHeight', $element.height() );
					$timeout(function (){
						$element.height( newHeight );
						$scope.wsWidget.isChangingState = true;
						$scope.wsWidget.state = newState;
						$timeout(function (){
							$scope.wsWidget.isChangingState = false;
							$scope.wsWidget.isReadyToChangeState = false;
							$element.css( 'minHeight', '' );
						},500);
					}, 50)
				}
			})();
			$scope.removeFromWorkspace = function (){
				workspaceService.removeWidget( $scope.wsWidget ).then(function (){
					if ( $scope.widget ){
						$scope.widget.setFree();
					}
					if ( ! $scope.$$phase ){
						$scope.$apply();
					}
				});
			}

			$rootScope.$on( 'widgetPublished', onWidgetPublished );
			$rootScope.$on( 'widgetClonedAndPublished', onWidgetPublished );

			function onWidgetPublished( event, eventData ){
				if ( eventData.widget && eventData.widget.id == $scope.wsWidget.id ){
					$scope.removeFromWorkspace()
				}
			}

			$scope.onSubmit = function (){
				if ( false !== $scope.edit.validate() ){
					$scope.wsWidget.saveEdited().then(function ( res ){
						$scope.changeState( $scope.STATES.VIEW );
					});
					if ( $scope.widget ){
						$scope.widget.setFree();
					}
				}
				return false;
			}

			$scope.onCancel = function (){
				if ( $scope.wsWidget && $scope.wsWidget.isFresh && $scope.widget ){
					$scope.removeFromWorkspace();
					$scope.widget.selfDelete();
				}
				else{
					$scope.changeState( $scope.STATES.VIEW );
					if ( $scope.widget ){
						$scope.widget.setFree();
					}
				}
			}

			$scope.removeFromWorkspaceWhenEdit = function (){
				if ( $scope.wsWidget && $scope.wsWidget.isFresh && $scope.widget ){
					/*
					* After selfDelete complete widget will occur 'widgetDelete' event
					* which will get caught by workspaceService and then related wsWidget will be removed
					*/
					$scope.widget.selfDelete();
				}
				else{
					$scope.removeFromWorkspace();
				}
			}

			$scope.prepareRemove = function (){
			    $scope.wsWidget.aboutRemove = true;
			}
			$scope.cancelPrepareRemove = function (){
			    $scope.wsWidget.aboutRemove = false;
			}
			$scope.remove = function (){
				$scope.widget.selfDelete();
			}


		}] );