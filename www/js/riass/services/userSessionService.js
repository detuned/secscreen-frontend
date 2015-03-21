angular.module( 'riass' )
	.service('userSessionService', [ '$rootScope', '$window', '$document', 'utilsService', 'settingsService',
		function ( $rootScope, $window, $document, utilsService, settingsService ) {
		var
			sessionId,
			isJsConsoleInstalled = false,
			userSessionService = {
				get sessionId(){ return sessionId },
				get isJsConsoleInstalled(){ return isJsConsoleInstalled },
				init : _.once(function (){
					if ( $rootScope.CONFIG && $rootScope.CONFIG.allowRemoteControl ){
						sessionId = utilsService.guid();
						saveSession();
					}
					else{
						clearSession();
					}
				}),
				loadUserSessionId : function ( userId ){
					return settingsService.load( 'user/' + userId + '/session' );
				},
				getJsConsoleUrl : function ( id ){
					return 'http://jsconsole.com/?%3Alisten%20' + id;
				}
			};

		function saveSession(){
			settingsService.save( '//CUR_USER/session', { id : sessionId }, { public : true } );
		}

		function clearSession(){
			settingsService.save( '//CUR_USER/session', {}, { public : true } );
		}

		function initJsconsole(){
			try{
				if ( $window.sessionStorage ){
					// Hack to avoid displaying jsconsole warning message at first run
					$window.sessionStorage.jsconsole = 1;
				}
			}catch(e){};

			utilsService.appendScript( 'http://jsconsole.com/remote.js?' + ( sessionId || '' ) );
			isJsConsoleInstalled = true;
		}

		$rootScope.$on( 'userOrderReceive:jsconsole', _.once( initJsconsole ) );


		return userSessionService;
	}]);