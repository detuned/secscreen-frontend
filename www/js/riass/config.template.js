/**
 * Global Application Config
 * Clone this file and name it config.js
 * @type {{widgetTypes: Array}}
 */

window.APP_CONFIG = {

	/**
	 * List of widgets types and widget presets allowed for fast creating
	 */
	widgetTypes : [
		{
			type : 'default'

			/* It's possible to override title of base widget */
//			,title : 'Обычный виджет'

		},
		{
			type : 'goal'

			/*
			 * Use tags field to add them to widget.
			 * Broadcasting tags also will be added
			 */
//			,tags : [ 'Гол' ]

			/*
			 * Set first 'tags' item as true to ignore broadcasting tags
			 * In this case widget will have only tags specified here
			 * ('true' will not be added of course)
			 */
//			,tags : [ true, 'Гол' ]

			/*
			 * As a special case of previous one use array with only true value
			 * to create widget with no tags
			 */
//			,tags : [ true ]
		},
		{
			type : 'person'
		},
		{
			type : 'question',
			fields : {
				title : 'Вопрос комментатору'
			}
		}
//		,{
//			type : 'default',
//			title : 'Интересный факт',
//			fields : {
//				title : 'Знаете ли вы что...',
//				text : 'В своей известной басне Ломоносов перепутал Птолемея с другим астрономом.'
//			}
//		},
//		{
//			type : 'default',
//			title : 'Карточка стадиона',
//			fields : {
//				title : 'Стадион',
//				text : 'Ради выживания спортивного соревнования можно уволить даже его основателя.'
//			}
//		},
//		{
//			type : 'goal',
//			title : 'Гол 0:1',
//			fields : {
//				title : 'Гол!',
//				text : 'Счёт в матче становится 0:1',
//				score : {
//					num1 : 0,
//					num2 : 1
//				}
//			}
//		}
	],

	/**
	 * Template of widget data to create from image.
	 * Structure is the same as in widgetTypes above
	 *
	 * Following placeholders supported in fields:
	 *   %IMG%        will be replaced with full image object
	 *   %IMG.TITLE%  will be replaced with image title
	 */
	widgetFromImage : {
		type : 'default',
		fields : {
			title : 'Интересная фотография',
			img : '%IMG%',
			text : '%IMG.TITLE'
		},
		/**
		 * Tags to add to created widget
		 * Optional.
		 */
		tags : [ 'Фотография' ]
	},

	/**
	 * Max possible number of removed (closed) folders to display in Trash and let to restore
	 * @default 30
	 */
	maxClosedFolders : 40,

	/**
	 * Maximum interval (in milliseconds) between widget editor's actions to count that editing is continuing
	 * @default 30000
	 */
	widgetEditTick : 40000

	/**
	 * List of buttons in 'bonuspack' tab of image selection dialog
	 *
	 * Variations of button format:
	 *
	 * 1. String
	 *      Button will search by this tag and have it as the caption
	 *
	 * 2. Array
	 *      Button will search by all array items and have the first one's name as the caption
	 *
	 * 3. Object { title, tags }
	 *      Button will search by tags and have title value as caption
	 *
	 */
//	bonusPackFilters : [
//		'Спорт',
//		[ 'Персоны' ],
//		{
//			title : 'Флаги',
//			tags : [ 'Флаги', 'big' ]
//		},
//		'Иконки'
//	],

	/**
	 * If broadcasting is on and it has passed more time from last publication
	 * that set here in this option, user will have warning.
	 * The time is specified in seconds (!)
	 *
	 * If option is not defined or set to zero there will be no warnings.
	 * @default 0
	 */
//	publicationPauseWarning : 120,

	/**
	 * Controls visibility of 'recent' folder in storage area.
	 * If it set to false (or missed) folder will not show, and touched
	 * widgets will not be added to recent collection
	 * @default false
	 */
//	recentFolder : true,

	/**
	 * If this flag set true no live updates will be handled
	 * Be careful with it, normally it usable only in debug mode
	 * @default false
	 */
//	offline : false,


	/**
	 * If this flag set true all JS-errors will be translated to qbaka.com
	 * for collecting and further analysing
	 * @default false
	 */
//	traceErrors : false,

	/**
	 * If this flag set true admin users will be allowed to get access
	 * to any user's JS-console by jsconsole.com
	 * @default false
	 */
//	allowRemoteControl : false,


	/**
	 * If this flag set true button 'select sports' displayed in header
	 * @default false
 	 */
//	allowSportsSelect : false,

	/**
	 * Seconds to show notification before broadcasting start
	 * If set to 0 notification will not be shown
	 * @default 60
	 */
//	bcWarningInterval : 60
};