angular.module( 'riass' )
	.directive( 'headerDropdown', [ '$document', '$window', function ( $document, $window ){
		var
			globalId = 0;
		return {
			template   : '<div class="header-dropdown">' +
				'<span class="header-dropdown_title" data-ng-bind="title"></span>' +
				'<div class="header-dropdown_body" data-ng-transclude></div>' +
				'</div>',
			replace    : true,
			transclude : true,
			scope      : {
				title : '@'
			},
			link       : function ( scope, elem, attrs ){
				globalId ++;
				var
					title = elem.find( '.header-dropdown_title' ),
					activeClass = 'header-dropdown__active',
					isShown = elem.hasClass( activeClass ),
					elemUniqClass = 'header-dropdown__id-' + globalId;
				elem.addClass( elemUniqClass );
				if ( attrs.id ){
					elem.addClass( 'header-dropdown__' + attrs.id );
				}
				function show(){
					if ( isShown ){
						return;
					}
					elem.addClass( activeClass )
					isShown = true;
					$document.on( 'mousedown.' + elemUniqClass, function ( e ){
						if ( ! angular.element( e.target ).is( '.' + elemUniqClass + ' *' ) ){
							hide();
						}
					} );
				}

				function hide( e ){
					if ( ! isShown ){
						return;
					}
					elem.removeClass( activeClass );
					$document.off( '.' + elemUniqClass );
					isShown = false;
				}


				title.on( 'click', function ( e ){
					e.stopPropagation();
					if ( isShown ){
						hide();
					}
					else {
						show();
					}
				} );

				elem.on( 'click', '[data-dropdown-close]', hide );

			}
		}
	}] )
	.directive( 'bcTextStatus', [ '$timeout', '$rootScope', 'CONST', 'utilsService', function ( $timeout, $rootScope, CONST, utilsService ){
		var
			baseInterval = 10000,
			timer,
			prefixesByStatus = {},
			postfixesByStatus = {};

		prefixesByStatus[ CONST.BROADCASTING_STATUS_OFF ] = 'Start after ';
		prefixesByStatus[ CONST.BROADCASTING_STATUS_ON ] = 'On the air ';
		prefixesByStatus[ CONST.BROADCASTING_STATUS_DONE ] = 'Completed ';

		postfixesByStatus[ CONST.BROADCASTING_STATUS_DONE ] = ' ago';

		return {
			scope      : {
				date   : '=',
				status : '=',
				onTick : '='
			},
			restrict   : 'A',
			template   : '<span data-ng-bind="bcTextStatus"></span>',
			controller : [ '$scope', '$attrs', function ( $scope, $attrs ){
				var onUpdate = angular.isFunction( $scope.onTick )
					? $scope.onTick
					: function(){};
				updateStatus();

				$scope.$watch( 'date', updateStatus );

				function resetTimer(){
					if ( timer ){
						$timeout.cancel( timer );
					}
				}

				function updateStatus(){
					var
						startDate,
						now,
						diff,
						absDiff,
						interval,
						res = [],
						status;
					resetTimer();
					if ( ! angular.isDate( $scope.date ) ){
						$scope.bcTextStatus = '';
						timer = $timeout( updateStatus, baseInterval );
						return;
					}
					now = moment();
					startDate = moment( $scope.date );
					diff = now.diff( startDate, 'seconds' );
					absDiff = Math.abs( diff );

					onUpdate( now );

					status = $scope.status == CONST.BROADCASTING_STATUS_OFF && $rootScope.broadcasting && $rootScope.broadcasting.ended_at
						? CONST.BROADCASTING_STATUS_DONE
						: $scope.status;

					prefixesByStatus[ status ] && res.push( prefixesByStatus[ status ] );

					if ( absDiff > 24 * 3600 ){
						res.push( utilsService.plural( Math.abs( now.diff( startDate, 'days' ) ), [ '%d day', '%d days', '%d days' ] ) )
					}
					else {
						(function (){
							var
								h = Math.floor( absDiff / 3600 ),
								m = Math.floor( ( absDiff - h * 3600 ) / 60 ),
								s = ( absDiff - h * 3600 - m * 60 ),
								parts = [];
							if ( h > 0 ){
								parts.push( _.str.pad( h, '2', '0' ) );
							}
							parts.push(
								_.str.pad( m, '2', '0' ),
								_.str.pad( s, '2', '0' )
							);
							res.push( parts.join( ':' ) );
						})();
					}

					postfixesByStatus[ status ] && res.push( postfixesByStatus[ status ] );

					$scope.bcTextStatus = res.join( '' );
					interval = baseInterval;
					if ( absDiff < 3600 * 24 ){
						interval = 1000;
					}
					timer = $timeout( updateStatus, interval );
				}
			}]
		}
	} ] )
	.directive( 'soundWarnOnce', [ '$window', function ( $window ){
		return {
			link : function ( scope, element, attrs ){
				attrs.$observe( 'soundWarnOnce', function ( v ){
					if ( v && v != 'false' && $window.Howl ){
						new Howl({
							urls: ['/s/files/warn.wav']
						}).play();
					}
				} )
			}
		}
	}])
	.directive( 'tagsInput', [ '$rootScope', 'tagsService', function ( $rootScope, tagsService ){
		var totalNum = 0;
		return {
			restrict    : 'E',
			replace     : true,
			scope       : {
				tags         : '=',
				query        : '=',
				allowAddTags : '@',
				type         : '@',
				focusOn      : '@'
			},
			templateUrl : $rootScope.__getUrl( '//APP/views/tagsInput.html' ),
			controller  : [ '$scope', '$element', '$attrs', '$timeout', '$compile', '$document', '$window',
				function ( $scope, $element, $attrs, $timeout, $compile, $document, $window ){

					var
						windowElement = angular.element( $window ),
						globalId = ++ totalNum,
						eventFamily = [ '.tagsInput', globalId ].join( '_' );
					/* Handling field focus */
					;
					(function (){
						var
							hoverElement,
							isShown = false,
							hoverParentElement = $document.find( 'body' ),
							showTimer,
							showDelay = 50,
							resetShowTimer = function (){
								if ( showTimer ){
									$timeout.cancel( showTimer );
								}
							}

						$scope.formState = {};
						$element
							.on( 'click', '.tags-input_list', show )
							.on( 'remove', _.partial( hide, true ) );

						if ( $attrs.focusOn ){
							$attrs.$observe( 'focusOn', function ( v ){
								if ( v && v != 'false' ){
									show();
								}
								else {
									hide( true );
								}
							} )
						}

						function show(){
							resetShowTimer();
							if ( isShown ){
								return;
							}
							if ( ! hoverElement ){
								hoverElement = angular.element( '<div class="tags-form"></div>' )
									.on( 'mouseover', show )
									.on( 'mouseleave', hide )
									.html( '<tags-form></tags-form>' );
								if ( $scope.type ){
									(function (){
										var parts = $scope.type.toString().split( ',' );
										angular.forEach( parts, function ( part ){
											hoverElement.addClass( 'tags-form__type-' + part );
										} )
									})();
								}
								$compile( hoverElement.contents() )( $scope );
								hoverElement.appendTo( hoverParentElement );
							}

							place();
							windowElement
								.on( 'resize' + eventFamily +
									' scroll' + eventFamily,
									place );
							$document
								.on( 'layoutUpdate' + eventFamily, _.partial( hide, true ) );

							$element
								.onReposition(
								function ( event, eventData ){
									if ( eventData.triggerEvent == 'scroll' ){
										/*
										 * Hide when storage panel scrolling
										 * but not when folder's engine changes number of widgets
										 */
										hide( true )
									}
								}
							)
								.onChangeState( _.partial( hide, true ) );
							hoverElement.addClass( 'is-active' );
							isShown = true;

						}

						function hide( force ){
							resetShowTimer();
							if ( force !== true &&
								( ! isShown || ! $scope.formState.isReady
									|| $scope.formState.isFocused ) ){
								return;
							}
							isShown = false;
							if ( hoverElement ){
								hoverElement.removeClass( 'is-active' );
								if ( force === true ){
									completeHide();
								}
								else {
									$timeout( function (){
										if ( ! isShown && ! $scope.formState.isFocused ){
											completeHide();
										}
									}, 300 );
								}
							}
							function completeHide(){
								if ( hoverElement ){
									resetFormState();
									hoverElement.remove();
									hoverElement = null;
									windowElement.off( eventFamily );
									$document.off( eventFamily );
									$element
										.offReposition()
										.offChangeState();
								}
							}
						}

						function place(){
							if ( ! $element.is( ':visible' ) ){
								return;
							}
							var
								fieldPos = $element.offset(),
								fieldWidth = $element.outerWidth(),
								fieldHeight = $element.outerHeight(),
								windowHeight = windowElement.height();
							hoverElement
								.css( {
									position  : 'absolute',
									top       : fieldPos.top,
									left      : fieldPos.left,
									width     : fieldWidth,
									minHeight : fieldHeight
								} );
							$scope.formState.isLocatedTooDown = ( windowHeight - fieldPos.top < 200 );
						}

						function resetFormState(){
							$scope.formState.isFocused = false;
							$scope.formState.isReady = false;
							$scope.formState.onRemoveAllTags = function (){
							};
							$scope.formState.onRemoveTag = function (){
							};
							$scope.formState.onRemoveQuery = function (){
							};
							$scope.formState.isLocatedTooDown = false;
						}

						$scope.formState.hide = hide;
						resetFormState();

					})();

					$scope.removeTag = function ( tag, event ){
						tagsService.removeTag( tag, $scope.tags );
						$scope.formState.onRemoveTag();
						if ( event ){
							event.stopPropagation();
						}
					}

					$scope.removeAllTags = function (){
						$scope.tags.length = 0;
						$scope.formState.onRemoveAllTags();
					}

					$scope.removeQuery = function (){
						$scope.query = '';
						$scope.formState.onRemoveQuery();
					}


					$scope.removeAll = function (){
						$scope.removeQuery();
						$scope.removeAllTags();
					}

					$scope.isTagNew = tagsService.isTagNew;
					$scope.isTagDefault = tagsService.isTagDefault;

					$scope.allowQuery = 'query' in $attrs;

				}]
		}

	}] )
	.directive( 'tagsForm', [ '$rootScope', '$timeout', 'tagsService', function ( $rootScope, $timeout, tagsService ){
		return {
			restrict    : 'E',
			templateUrl : $rootScope.__getUrl( '//APP/views/tagsForm.html' ),
			replace     : true,
			controller  : [ '$scope', '$element', function ( $scope, $element ){

				var
					isFocused = false,
					labelElement = $element.find( '.tags-form_field-wrap' ),
					fieldElement = $element.find( '.tags-form_field' )
						.on( 'focus', function (){
							isFocused = true;
							$scope.formState.isFocused = true;
						} )
						.on( 'blur', function (){
							isFocused = false;
							$timeout( function (){
								if ( ! isFocused ){
									$scope.formState.isFocused = false;
									$scope.formState.hide();
								}
							}, 100 );
						} );


				$scope.autocomplete = tagsService.Autocomplete( {
					allowAddTags : angular.isDefined( $scope.allowAddTags ),
					allowQuery   : ! ! $scope.allowQuery
				} );

				$scope.autocomplete.value = $scope.query;


				$scope.tagsHighlighted = {};
				$scope.selectTag = function ( suggestedIndex ){
					var
						suggestedTag,
						existentTag,
						existentIndex,
						isNew;
					if ( ! angular.isDefined( suggestedIndex ) || ! ( suggestedTag = $scope.autocomplete.suggest[ suggestedIndex ] ) ){
						return;
					}


					if ( suggestedIndex == $scope.autocomplete.addTagIndex ){
						/* Adding new tag */
						suggestedTag = $scope.autocomplete.value;
						isNew = true;
					}

					existentIndex = tagsService.getTagsIndex( suggestedTag, $scope.tags );
					if ( existentIndex > - 1 && ( existentTag = $scope.tags[ existentIndex ] ) ){
						//Tag already selected so do not adding but just highlighting it for a time
						if ( $scope.tagsHighlighted[ existentTag ] ){
							$timeout.cancel( $scope.tagsHighlighted[ existentTag ] );
						}
						$scope.tagsHighlighted[ existentTag ] = $timeout( function (){
							$timeout.cancel( $scope.tagsHighlighted[ existentTag ] );
							delete $scope.tagsHighlighted[ existentTag ];
						}, 500 );
					}
					else {
						if ( isNew ){
							tagsService.registerTag( suggestedTag );
						}
						$scope.tags.push( suggestedTag );
					}


					clearField();
					$scope.setQuery();
					focusField();
				}


				/**
				 * Flushes current autocomplete text to scope's query field
				 */
				$scope.setQuery = function (){
					if ( $scope.allowQuery ){
						$scope.query = $scope.autocomplete.value;
					}
				}

				$scope.isTagHighlighted = function ( tag ){
					return ! ! $scope.tagsHighlighted[ tag ];
				}

				fieldElement
					.autoGrowInput( {
						comfortZone : 10,
						minWidth    : 20,
						maxWidth    : $element.width()
					} )
					.val( $scope.autocomplete.value )
					.trigger( 'update' )
					.on( 'keydown', function ( event ){
						switch ( event.which ){
							// Arrow Up
							case 38:
								$scope.autocomplete.highlightedIndex --;
								event.preventDefault();
								applyScope();
								break;
							// Arrow Down
							case 40:
								if ( $scope.autocomplete.isEmpty ){
									$scope.autocomplete.update();
								}
								else {
									$scope.autocomplete.highlightedIndex ++;
									applyScope();
								}
								event.preventDefault();
								break;
							// Enter
							case 13:
								if ( $scope.autocomplete.getHighlighted() ){
									/* If anything highlighted now add it as new tag */
									$scope.selectTag( $scope.autocomplete.highlightedIndex );
								}
								else if ( $scope.allowQuery ){
									/* If nothing is highlighted applying query */
									$scope.setQuery();
									$scope.autocomplete.clear();
								}
								applyScope();
								break;
							//Backspace
							case 8:
								var value = fieldElement.val();
								if ( value.toString().length === 0 && $scope.tags.length ){
									$scope.tags.pop();
									applyScope();
									event.preventDefault();
								}
								break;
						}

					} )


				$element
					.on( 'mouseover', '.tags-form_suggest-item', function (){
						$scope.autocomplete.highlightedIndex = $( this ).prevAll().length;
						applyScope();
					} );
				$scope.formState.onRemoveTag = focusField;
				$scope.formState.onRemoveAllTags = focusField;
				$scope.formState.isReady = true;
				$scope.formState.onRemoveQuery = clearField;

				function focusField(){
					fieldElement.trigger( 'focus' );
				}

				function clearField(){
					$scope.autocomplete.value = '';
					$scope.autocomplete.update( true );
				}

				function applyScope(){
					if ( ! $scope.$$phase ){
						$scope.$apply();
					}
				}

				focusField();
			}]
		}
	}] )

	.directive( 'notifier', [ '$rootScope', function ( $rootScope ){
		return {
			restrict    : 'E',
			replace     : true,
			templateUrl : $rootScope.__getUrl( '//APP/views/notifier.html' ),
			controller  : [ '$scope', '$element', 'notifyService', function ( $scope, $element, notifyService ){
				$scope.message = function (){
					return notifyService.message;
				};
				$scope.action = function ( action ){
					if ( $scope.message && $scope.message.action ){
						$scope.message.action( action );
					}
				}
			}]
		}
	}] )

	.directive( 'fieldAutocomplete', [ '$timeout', '$compile', '$document', '$window', 'autocompleteService',
		function ( $timeout, $compile, $document, $window, autocompleteService ){
			var totalNum = 0;
			return {
				restrict : 'A',
				require  : '?ngModel',
				scope    : {},
				link     : function ( scope, element, attrs, ngModel ){
					var
						windowElement = angular.element( $window ),
						isShown = false,
						queryBeginPos = 0,
						currentCaretPos,
						globalId = ++ totalNum,
						eventFamily = [ '.tagsInput', globalId ].join( '_' ),
						acParentElement = $document.find( 'body' ),
						acElement;

					scope.autocomplete = autocompleteService.Autocomplete();
					ngModel.$viewChangeListeners.push( onModelChange );


					scope.acState = {};

					element
						.on( 'focus', function (){
							scope.acState.isFocused = true;
						} )
						.on( 'click', function (){
							show();
							updateAutocomplete();
						} )
						.on( 'keyup', function ( event ){
							if ( event.which != 13 && event.which != 38 && event.which != 40 ){
								show();
								updateAutocomplete();
							}
						} )
						.on( 'blur', function (){
							scope.acState.isFocused = false;
							hide();
						} )
						.on( 'keydown', function ( event ){
							if ( ! isShown || scope.autocomplete.isEmpty ){
								return;
							}
							switch ( event.which ){
								// Arrow Up
								case 38:
									scope.autocomplete.highlightedIndex --;
									event.preventDefault();
									applyScope();
									break;
								// Arrow Down
								case 40:
									if ( scope.autocomplete.isEmpty ){
										scope.autocomplete.update();
									}
									else {
										scope.autocomplete.highlightedIndex ++;
										applyScope();
									}
									event.preventDefault();
									break;
								// Enter
								case 13:
									if ( scope.autocomplete.getHighlighted() ){
										/* If anything highlighted now add it as new tag */
										scope.selectItem( scope.autocomplete.highlightedIndex );
									}
									hide( true );
									applyScope();
									event.preventDefault();
									break;
							}

						} )

					function onModelChange(){
						if ( scope.acState.isChanging || ! scope.acState.isFocused ){
							return;
						}
						show();
						updateAutocomplete();
					}

					function updateAutocomplete(){
						var
							value = _.string.trim( element.val(), ' ' ), //ngModel.$viewValue,
							nlIndex;
						currentCaretPos = element[0].selectionStart;
						queryBeginPos = 0;
						if ( value ){
							value = value.toString().substr( 0, currentCaretPos );
							try{
								nlIndex = Math.max( value.lastIndexOf( "\n" ), value.lastIndexOf( "," ) );
								if ( nlIndex > 0 ){
									queryBeginPos = nlIndex;
								}
								value = value.substr( queryBeginPos )
							}
							catch ( e ) {}
						}
						scope.autocomplete.value = value;
						scope.autocomplete.queryId = currentCaretPos;
						scope.autocomplete.update();
					}

					function show(){
						if ( isShown ){
							place();
							return;
						}
						if ( ! acElement ){
							acElement = angular.element( '<div class="field-autocomplete_wrap"></div>' )
								.html( '<field-autocomplete-list></field-autocomplete-list>' );

							$compile( acElement.contents() )( scope );
							acElement
								.on( 'mouseover', '.field-autocomplete_suggest-item', function (){
									scope.autocomplete.highlightedIndex = $( this ).prevAll().length;
									applyScope();
								} )
								.appendTo( acParentElement )
						}
						place();
						windowElement
							.on( 'resize' + eventFamily +
								' scroll' + eventFamily,
								place );
						$document
							.on( 'layoutUpdate' + eventFamily, _.partial( hide, true ) );

						element
							.onReposition(
							function ( event, eventData ){
								if ( eventData.triggerEvent == 'scroll' ){
									/*
									 * Hide when parent panel scrolling
									 * but not when folder's engine changes number of widgets
									 */
									hide( true )
								}
							}
						)
							.onChangeState( _.partial( hide, true ) );

						isShown = true;
					}

					function hide( force ){
						if ( force !== true &&
							( ! isShown || ! scope.acState.isReady
								|| scope.acState.isFocused ) ){
							return;
						}
						isShown = false;
						if ( acElement ){
							acElement.removeClass( 'is-active' );
							if ( force === true ){
								completeHide();
							}
							else {
								$timeout( function (){
									if ( ! isShown && ! scope.acState.isFocused ){
										completeHide();
									}
								}, 300 );
							}
						}
						function completeHide(){
							if ( acElement ){
								resetAcState();
								acElement.remove();
								acElement = null;
								windowElement.off( eventFamily );
								$document.off( eventFamily );
								element
									.offReposition()
									.offChangeState();
								scope.autocomplete.clear();
							}
						}
					}

					function resetAcState(){
						scope.acState.isReady = false;
					}


					function place(){
						if ( ! element.is( ':visible' ) ){
							return;
						}
						var
							fieldPos = element.offset(),
							fieldWidth = element.outerWidth(),
							fieldHeight = element.outerHeight(),
							windowHeight = windowElement.height();
						acElement
							.css( {
								position : 'absolute',
								left     : fieldPos.left,
								width    : fieldWidth
							} );

						if ( scope.acState.isLocatedTooDown = ( windowHeight - fieldPos.top < 200 ) ){
							acElement
								.css( {

									top    : 'auto',
									bottom : windowHeight - fieldPos.top
								} );
						}
						else {
							acElement
								.css( {
									bottom : 'auto',
									top    : fieldPos.top + fieldHeight
								} );
						}
					}


					scope.selectItem = function ( suggestedIndex ){
						var
							newValue,
							suggestedItem,
							queryBeginSubstr,
							querySubstr;
						if ( ! angular.isDefined( suggestedIndex ) || ! ( suggestedItem = scope.autocomplete.suggest[ suggestedIndex ] ) ){
							return;
						}

						scope.acState.isChanging = true;
						if ( ! isNaN( currentCaretPos ) ){
							queryBeginSubstr = ngModel.$viewValue.substr( 0, queryBeginPos );
							querySubstr = ngModel.$viewValue.substr( queryBeginPos, currentCaretPos )
								.replace(
									new RegExp(
										suggestedItem.query.toString().replace( /\\/g, '\\\\' )
									),
									suggestedItem.result
								);
							newValue = queryBeginSubstr + querySubstr + ngModel.$viewValue.substr( currentCaretPos );
						}
						else {
							querySubstr = suggestedItem.result;
							newValue = querySubstr;
						}
						ngModel.$setViewValue( newValue );
						ngModel.$render();
						element[0].selectionStart = element[0].selectionEnd = queryBeginPos + querySubstr.length;
						scope.acState.isChanging = false;
						hide( true );
					}

					function applyScope(){
						if ( ! scope.$$phase ){
							scope.$apply();
						}
					}


				}
			}
		} ] )
	.directive( 'fieldAutocompleteList', [ '$rootScope', function ( $rootScope ){
		return {
			restrict    : 'E',
			replace     : true,
			templateUrl : $rootScope.__getUrl( '//APP/views/fieldAutocomplete.html' ),
			link        : function ( scope ){
				scope.acState.isReady = true;
			}
		}
	}] )
	.directive( 'repositionTrigger', [function (){
		return function ( scope, element, attrs ){
			function trigger( event ){
				element.triggerReposition( { triggerElement : element, triggerEvent : event } );
			}

			if ( attrs.repositionTrigger == 'scroll' ){
				element.on( 'scroll', _.partial( trigger, 'scroll' ) );
			}
			else {
				scope.$watch( attrs.repositionTrigger, trigger );
			}
		}
	}] )
	.directive( 'changeStateTrigger', [function (){
		return function ( scope, element, attrs ){
			function trigger(){
				element.triggerChangeState();
			}

			if ( attrs.changeStateTrigger == 'scroll' ){
				element.on( 'scroll', trigger );
			}
			else {
				scope.$watch( attrs.changeStateTrigger, trigger );
			}
		}
	}] )
	.directive( 'sortableList', [ '$parse', function ( $parse ){
		return function ( scope, element, attrs ){
			var
				completeData = {
					start  : 0,
					finish : 0
				},
				data = angular.extend( {
					handle : '.sortable-handler'
				}, scope.$eval( attrs.sortableList ) || {} );

			if ( angular.element.fn.sortable ){
				element.sortable( angular.extend( _.omit( data, 'onSort' ), {
					start : function ( event, res ){
						completeData.start = res.item.prevAll().length;
					},
					stop  : function ( event, res ){
						completeData.finish = res.item.prevAll().length;
						if ( angular.isFunction( data.onSort ) ){
							data.onSort( completeData )
						}
						else if (
							angular.isString( data.onSort ) &&
								angular.isFunction( scope[data.onSort] )
							){
							scope[data.onSort]( completeData );
						}
					}
				} ) );
			}
		}
	}] )
	.directive( 'scrollTop', [function (){
		return function ( scope, element, attrs ){
			attrs.$observe( 'scrollTop', function ( v ){
				element.scrollTop( 0 );
			} )
		}
	}] )
	.directive( 'scrollBottom', [function (){
		return function ( scope, element, attrs ){
			attrs.$observe( 'scrollBottom', function ( v ){
				element.scrollTop( ( element.prop( 'scrollHeight' ) || 10E6 ) + 50 );
			} )
		}
	}] )
	.directive( 'ngBindHtmlUnsafe', [function (){
		return function ( scope, element, attr ){
			element.addClass( 'ng-binding' ).data( '$binding', attr.ngBindHtmlUnsafe );
			scope.$watch( attr.ngBindHtmlUnsafe, function ngBindHtmlUnsafeWatchAction( value ){
				element.html( value || '' );
			} );
		}
	}] )
	.directive( 'dialog', [ '$rootScope', '$compile', '$window', function ( $rootScope, $compile, $window ){
		var windowElement = angular.element( $window );
		return {
			restrict    : 'E',
			replace     : true,
			scope       : {
				id          : '@',
				templateUrl : '@'
			},
			templateUrl : $rootScope.__getUrl( '//APP/views/dialog.html' ),
			controller  : [ '$scope', '$element', '$attrs', '$timeout', '$document', 'dialogsService', function ( $scope, $element, $attrs, $timeout, $document, dialogsService ){
				var
					bodyElement = $element.find( '.dialog_body' ),
					place = 'noResize' in $attrs
						? function (){
					}
						: function (){
						var
							dialogWidth = $element.outerWidth(),
							dialogHeight = $element.outerHeight(),
							windowWidth = windowElement.width(),
							windowHeight = windowElement.height();
						// TODO add comparsion dialogHeight with windowHeight
						$element.css( {
							top        : Math.max( 0, 0.5 * ( windowHeight - dialogHeight ) ),
							left       : '50%',
							marginLeft : - dialogWidth * 0.5
						} );
					};
				bodyElement.html( '<dialog-body data-template-url="' + $scope.templateUrl + '"></dialog-body>' );
				$compile( bodyElement.contents() )( $scope );
				$scope.closeDialog = function (){
					dialogsService.activeDialog.close();
					windowElement.off( 'resize', place );
				}
				$scope.isReady = false;
				$scope.isBeforeReady = false;
				$scope.dialog = {
					data         : dialogsService.activeDialog.dialogData,
					close        : dialogsService.activeDialog.close,
					done         : dialogsService.activeDialog.setDone,
					fail         : dialogsService.activeDialog.setFail,
					ready        : function (){
						place();
						$scope.isReady = true;
						dialogsService.activeDialog.setReady();
					},
					whenReady    : dialogsService.activeDialog.whenReady,
					isReady      : function (){
						return dialogsService.activeDialog.isReady;
					},
					onPressEnter : dialogsService.activeDialog.onPressEnter
				};


				$scope.$on( 'dialogResize', function ( event, eventData ){
					event.stopPropagation();
					place( eventData );
				} );
				windowElement.on( 'resize', place );
			}]
		};
	}] )
	.directive( 'dialogBody', [ '$rootScope', function ( $rootScope ){
		return {
			restrict    : 'E',
			replace     : true,
			templateUrl : function ( tElement, tAttrs ){
				if ( tAttrs.templateUrl ){
					return $rootScope.__getUrl( tAttrs.templateUrl );
				}
			}
		};
	}] )
	.directive( 'dialogOverlay', [ '$timeout', 'dialogsService', function ( $timeout, dialogsService ){
		return {
			restrict : 'E',
			scope    : {
				type : '@'
			},
			replace  : true,
			template : '<div class="dialog_overlay" data-ng-class="[dialog.isReady ? \'\' : \'dialog_overlay__loading\', \'dialog_overlay__\' + type ]" data-ng-click="close()"></div>',
			link     : function ( scope, element, attrs ){
				$timeout( function (){
					element.addClass( 'dialog_overlay__on' );
				}, 200 );
				scope.dialog = dialogsService.activeDialog;
				scope.close = function (){
					dialogsService.activeDialog.close();
				}
			}
		}
	}] )
	.directive( 'onScrollBottom', [function (){
		return function ( scope, element, attrs ){
			var scroller = element[0];
			element.on( 'scroll', function (){
				if ( scroller.scrollTop + scroller.offsetHeight >= 0.95 * scroller.scrollHeight ){
					scope.$apply( attrs.onScrollBottom );
				}
			} )
		}
	}] )
	.directive( 'jcrop', [ '$window', function ( $window ){
		var windowElement = angular.element( $window );
		return function ( scope, element, attrs ){

			if ( ! angular.element.Jcrop ){
				throw new Error( 'jcrop directive: cannot run without jQuery.Jcrop' );
			}

			var
				currentImgUrl,
				options = angular.extend( {
					boxMaxWidth      : 1400,
					windowOffsetHor  : 20,
					windowOffsetVert : 20,
					ready            : function (){},
					onChange         : function (){},
					onSelect         : function (){}
				}, scope.jcropOptions || {} ),
				isReady = false;


			function initJcrop( imgUrl ){
				if ( imgUrl && currentImgUrl == imgUrl ){
					return;
				}
				element.empty();
				if ( ! imgUrl ){
					return;
				}

				var

					initParams = angular.extend(
						_.pick( options, 'aspectRatio', 'minSize', 'onChange', 'onSelect' ),
						{
							boxWidth  : Math.min( windowElement.width() - options.windowOffsetHor, options.boxMaxWidth ),
							boxHeight : windowElement.height() - options.windowOffsetVert
						}
					),
					imgElement = angular.element( '<img src="' + imgUrl + '">' )
						.on( 'load', function (){
							var
								imgSize = {
									width  : imgElement.width(),
									height : imgElement.height()
								};

							if ( initParams.minSize && initParams.minSize[0] && imgSize.width < initParams.minSize[0] ){
								initParams.minSize = [ imgSize.width ];
							}
							initParams.setSelect = [ 0, 0, imgSize.width, imgSize.width / options.aspectRatio ];

							imgElement.Jcrop( initParams, function (){
								if ( isReady ){
									scope.$emit( 'dialogResize' );
								}
							} );
							if ( ! isReady ){
								isReady = true;
								options.ready( imgSize );
							}
						} )
						.appendTo( element )
			}

			scope.$watch( function (){
				return scope.jcropImg
					? scope.jcropImg.orig_url || scope.jcropImg.url
					: '';
			}, initJcrop );
		}
	}] )