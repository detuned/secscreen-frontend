angular.module( 'riass', [] )
	.constant( 'CONST', {
		'BROADCASTING_STATUS_OFF'  : 0,
		'BROADCASTING_STATUS_ON'   : 1,
		'BROADCASTING_STATUS_DONE' : 10,

		'USER_ROLE_ADMIN'     : 1,
		'USER_ROLE_SR_EDITOR' : 2,
		'USER_ROLE_EDITOR'    : 3,

		'LAYOUT_PANEL_TYPE_HOR'  : 1,
		'LAYOUT_PANEL_TYPE_VER'  : 2,
		'LAYOUT_PANEL_STATE_MIN' : 0,
		'LAYOUT_PANEL_STATE_MAX' : 1,

		'WIDGET_VIEW_TEXT'    : 'text',
		'WIDGET_VIEW_MINI'    : 'mini',
		'WIDGET_VIEW_SMALL'   : 'small',
		'WIDGET_VIEW_DEFAULT' : 'default',
		'WIDGET_VIEW_EDIT'    : 'edit',

		'WIDGET_SIZE_SMALL' : 100,
		'WIDGET_SIZE_MINI'  : 80,

		'WIDGET_PUB_STATUS_OFF'       : 0,
		'WIDGET_PUB_STATUS_PRELOAD'   : 1,
		'WIDGET_PUB_STATUS_PUBLISH'   : 2,
		'WIDGET_PUB_STATUS_PRELOADED' : 3,
		'WIDGET_PUB_STATUS_PUBLISHED' : 4,

		'IMG_CHOOSE_POPUP_URL'     : '/',
		'IMG_EXPORT_TYPE_BLITZ'    : 1,
		'IMG_EXPORT_TYPE_VR'       : 2,
		'IMG_EXPORT_TYPE_INTERNAL' : 3,

		'IMG_TAG_FLAG'   : 'Flags',
		'IMG_TAG_SPORTS' : 'Sports',
		'IMG_TAG_MEDALS' : 'Medals',
		'IMG_TAG_ICONS'  : 'Icons',
		'IMG_TAG_PERSON' : 'Persons',

		'IMG_TAG__SMALL' : 'small',
		'IMG_TAG__BIG'   : 'big',

		'IMG_SIZE_FULL'  : 610,
		'IMG_SIZE_SMALL' : 150,
		'IMG_SIZE_MINI'  : 50,

		'IMG_PROD_THUMB_MAX'    : 1476,
		'IMG_PROD_ASPECT_RATIO' : 16 / 9,

		'IMG_SORT_TIME_ASC'  : 0,
		'IMG_SORT_TIME_DESC' : 1,

		'TAG_MODE_AND' : 1,
		'TAG_MODE_OR'  : 2
	} )
	.run( [ '$rootScope', '$document', '$window', 'CONST', function ( $rootScope, $document, $window, CONST ){

		/* Setting default values */
		$rootScope.appPath = '';
		$rootScope.apiPath = '';
		$rootScope.imgPath = '';

		/* Getting, parsing and applying initData (stored at body tag)*/
		;
		(function (){
			var initData = $rootScope.$eval( $document.find( 'body' ).data( 'initData' ) || '' );
			angular.extend( $rootScope, initData );
		})();

		$rootScope.user = $rootScope.user || $document.find( 'body' ).data( 'userData' );

		if ( $rootScope.user && $rootScope.user.id && $window.qbaka ){
			$window.qbaka.user = $rootScope.user.id;
		}

		$rootScope.__getUrl = function ( url ){
			return url.toString()
				.replace( /^\/\/app\//i, $rootScope.appPath + '/' )
				.replace( /^\/\/api\//i, $rootScope.apiPath + '/' )
				.replace( /^\/\/img\//i, $rootScope.imgPath + '/' );
		}
		$rootScope.CONST = CONST;

		$rootScope.CONFIG = $window.APP_CONFIG || {};

		/* Extending angular.element to support reposition event */
		;
		(function (){
			var
				eventName = 'reposition',
				className = 'sensitive-to-reposition';
			angular.extend( angular.element.fn, {

				onReposition      : function ( listener ){
					return this.addClass( className ).on( eventName, listener );
				},
				offReposition     : function (){
					return this.removeClass( className ).off( eventName );
				},
				triggerReposition : function ( eventData ){
					return this.find( '.' + className ).trigger( eventName, eventData );
				}
			} );
		})();

		/* Extending angular.element to support onChangeState event */
		;
		(function (){
			var
				eventName = 'changeState',
				className = 'sensitive-to-changeState';
			angular.extend( angular.element.fn, {

				onChangeState      : function ( listener ){
					return this.addClass( className ).on( eventName, listener );
				},
				offChangeState     : function (){
					return this.removeClass( className ).off( eventName );
				},
				triggerChangeState : function ( eventData ){
					return this.find( '.' + className ).trigger( eventName, eventData );
				}
			} );
		})();

		/* Auto resize input field */
		;
		(function (){
			angular.element.fn.autoGrowInput = function ( o ){

				o = angular.element.extend( {
					maxWidth    : 1000,
					minWidth    : 0,
					comfortZone : 70
				}, o );

				this.filter( 'input:text' ).each( function (){

					var minWidth = o.minWidth || angular.element( this ).width(),
						val = '',
						input = angular.element( this ),
						testSubject = angular.element( '<tester/>' ).css( {
							position      : 'absolute',
							top           : - 9999,
							left          : - 9999,
							width         : 'auto',
							fontSize      : input.css( 'fontSize' ),
							fontFamily    : input.css( 'fontFamily' ),
							fontWeight    : input.css( 'fontWeight' ),
							letterSpacing : input.css( 'letterSpacing' ),
							whiteSpace    : 'nowrap'
						} ),
						check = function (){

							if ( val === (val = input.val()) ){
								return;
							}

							// Enter new content into testSubject
							var escaped = val.replace( /&/g, '&amp;' ).replace( /\s/g, '&nbsp;' ).replace( /</g, '&lt;' ).replace( />/g, '&gt;' );
							testSubject.html( escaped );

							// Calculate new width + whether to change
							var testerWidth = testSubject.width(),
								newWidth = (testerWidth + o.comfortZone) >= minWidth
									? testerWidth + o.comfortZone
									: minWidth,
								currentWidth = input.width(),
								isValidWidthChange = (newWidth < currentWidth && newWidth >= minWidth)
									|| (newWidth > minWidth && newWidth < o.maxWidth);

							// Animate width
							if ( isValidWidthChange ){
								input.width( newWidth );
							}

						};

					testSubject.insertAfter( input );
					angular.element( this ).on( 'keyup keydown blur update', check );
					check();
				} );

				return this;

			};

		})();

	} ] )

/**
 * Overrides $exceptionHandler to trace errors with qbaka
 */
	.factory( '$exceptionHandler', [ '$log', '$window', function ( $log, $window ){
		return function ( exception, cause ){
			if ( $window.qbaka && $window.qbaka.report ){
				$window.qbaka.report( exception );
			}
			$log.error( exception )
		};
	}] );