/**
 * ne-form v0.0.1
 *
 * Copyright (c) 2016 NE_SmallTown
 *
 * Date: 2016/9/01
 *
 * 优化/功能 -> 建议：
 * 1. switch改成key,map形式(但是无法解决多个key都是对应同一个方法的问题）
 * 2. 输入框可能是组合的形式，比如输入一个域名，前面的http://是固定的，后面的.com,.cn是可选的
 * 3. 用模板引擎
 * 4. 添加getComponent方法，创建单一表单组件
 */
  (function (window, factory) {
  "use strict";

  if (typeof define === "function" && define.amd) {
    // AMD. Register as an anonymous module.
    define(["jquery"], factory);
  } else if (typeof exports === "object") {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(require("jquery"));
  } else {
    // add to jQuery's namespace for more convenient
    // and avoid global variable pollution
    window.jQuery.ne_form = factory(window.jQuery);
  }
}(this, function($) {
	"use strict";

	// 要导出的对象
	var exports = {};

	// 默认配置
	var defaultOps = {
		itemOps: {
			// 下列(最后一个分界线以上)为items中可以设置的属性,在items中设置之后会覆盖itemOps中的值
			// col-xs-4, col-sm-4, col-md-4, col-lg-4
			// label_col与input_col配对，和值需为12
			input_type: 'text', // text/password/radio/checkbox/date/select/textarea/switch/slider
			input_placeholder: '',
			state: 'normal' , // 状态 normal/static/disabled/readonly
			input_name: 'name when get value', // 返回组件值的时候的key

			// 不同组件数据不同
			data: null,
			// 1.对于text, password, date。data不用设置

			// 2.对于radio，data应该是一个json数组，每个json中包含:
			// radioValue [string]: 在单选框右边显示的值

			// 3.对于checkbox, data应该是一个json数组,  每个json中包含:
			// checkboxValue [string]: 在多选框右边显示的值

			// 4.对于select
			// 4.1 需设置componentSetting,与select2参数(不包含data属性)一致
			// 4.2 data应该是一个json数组,  每个json中包含:
			// id [string]: 与select2插件要求一致
			// text [string]: 与select2插件要求一致

			// 5.对于date
			// 5.1 需设置componentSetting
			// 包含 defaultTime [string]: 默认时间
			// format [string]: 时间以什么格式显示，与YY mm这些通用规则相同
			// startDate [string]: 日期插件最早能选择到那个日期,格式与format相同

			// --------------------分界线------------------
			// 表单提交时上传的值， 设置在标签的data-submitValue属性上，若不设置，则与输入或选择的值一致
			// 如果用户自定义的话，那么需是一个函数，函数的形参为组件返回的值，函数的返回值为真正提交的值
			value: '',
			label_text: '我是label',
			componentSetting: null, // 组件特定设置。有些组件因为是引入第三方插件，所以需要一些特定的参数

			// --------------------分界线------------------
			label_col: 4,
			input_col: 8
		},

		// 水平排列,从左到右,从上到下排列元素
		// 默认一行最多3列,更改这个值要同步更改checkOps方法
		maxcol: 3,

		// 表单的验证规则, 默认不验证
		validation: null
	};

	var $form; // 存放最终形成的表单

	var mergedOps; // 合并后的参数

	var getBootstrapGrid = $.ne_Util.getBootstrapGrid;
	var createFormFuncMap = function(item) { // 根据类型不同，组件的创建方式不同
		var defaultItemOps = mergedOps.itemOps;

		var state, input_placeholder, itemData, submitValue, label_text, input_name;

		// 合并会用到的属性
		state = item.state || defaultItemOps.state;
		input_placeholder = item.input_placeholder || defaultItemOps.input_placeholder;
		submitValue = item.submitValue || defaultItemOps.submitValue;
		label_text = item.label_text || defaultItemOps.label_text;
		itemData = item.data || defaultItemOps.data;
		input_name = item.input_name || defaultItemOps.input_name;

		var $label = $(['<label class="', getBootstrapGrid(defaultItemOps.label_col), ' control-label">',
						item.label_text,
				  	 '</label>'].join('')),
			$contanier = $(['<div class="', getBootstrapGrid(defaultItemOps.input_col), '">', // 存放组件的容器
				  			'</div>'].join('')),
			tempStr = []; // 临时存放一些字符串

		return {
			text : function() {
				$contanier.append(['<input type="input" class="form-control" data-input-type="text" data-input-name=', input_name, '>'].join(''));
				return $label.add($contanier);
			},
			password : function() {
				$contanier.append(['<input type="password" class="form-control" data-input-type="password" data-input-name=', input_name, '>'].join(''));
				return $label.add($contanier);
			},
			radio : function() {
				tempStr.push('<div class="ne-form-item-control">',
							'<div class="ne-radio-group">');

				if(!Array.isArray(itemData))
					throw new Error('radio component\'s itemData must be an array');
				else {
					itemData.forEach(function(i, radioItem) {
						tempStr.push('<label class="ne-radio-wrapper">',
									'<span class="ne-radio">',
										'<span class="ne-radio-inner"></span>',
										'<input type="radio" class="ne-radio-input" data-input-type="radio" data-input-name=', input_name, '>',
									'</span>',
									'<span>', radioItem.radioValue, '</span>',
								 '</label>');
					});
				}

				$contanier.append(tempStr.concat('</div>').join(''));
				return $label.add($contanier);
			},
			checkbox : function() {
				tempStr.push('<div class="ne-form-item-control">');

				if(!Array.isArray(itemData))
					throw new Error('checkbox component\'s itemData must be an array');
				else {
					itemData.forEach(function(i, checkboxItem) {
						tempStr.push('<label class="ne-checkbox-wrapper">',
									'<label class="ne-checkbox-wrapper">',
										'<span class="ant-checkbox">',
											'<span class="ne-checkbox-inner"></span>',
											'<input type="checkbox" class="ant-checkbox-input" data-input-type="checkbox" data-input-name=', input_name, '>',
										'</span>',
										'<span>', checkboxItem.radioValue, '</span>',
								 '</label>');
					});
				}

				$contanier.append(tempStr.concat('</div>').join(''));
				return $label.add($contanier);
			},
			date : function() { // 设置表单的日期插件格式 (注意：需要在插件被加载后自己触发 )
				tempStr.push('<div class="input-group date form_time">',
							'<input class="form-control" type="text" data-input-type="date" data-input-name=', input_name, input_placeholder ? 'placeholder="' + input_placeholder + '"' : '', ' >',
							'<span class="input-group-addon"><span class="glyphicon glyphicon-remove"></span></span>',
							'<span class="input-group-addon"><span class="glyphicon glyphicon-time"></span></span>',
						 '</div>');

				$contanier.append(tempStr.concat('</div>').join(''));
				return $label.add($contanier);
			},
			switch : function() {
				return $label.add($contanier);
			},
			slider : function() {
				return $label.add($contanier);
			},
			file : function() { // 暂不实现
				return $label.add($contanier);
			},
			textarea : function() { // 暂不实现，后面决定是原生还是编辑器
				return $label.add($contanier);
			},
			select : function() {
				var $select = $('<select style="width: 100%" data-input-type="singleSelect" data-selectType="select2" data-input-name=' + input_name + '></select>'),
					componentSetting = item.componentSetting;

				if(!Array.isArray(itemData))
					throw new Error('select component\'s itemData must be an array');
				else if(!componentSetting)
					throw new Error('componentSetting must be required!');
				else {
					if(!componentSetting.data)
						componentSetting.data = itemData;

					// select加载到页面后触发，使数据插入
					$select.on('load.select.neForm', function(event) {
						$components.filter('[data-selectType="select2"]')
							.select2(componentSetting)
							.trigger('select2:select');
					});
				}

				$contanier.append($select).append('</div>');
				return $label.add($contanier);
			},
			color: function() {
				return $label.add($contanier);
			}
		};
	};

	// 针对一些特殊组件进行的一些配置或者修复
	!function globalConfigAndFix() {
		// 设置日期组件的格式
		$('body')
        .off('datetimepicker.load', '.form_time')
        .on('datetimepicker.load', '.form_time', function(event) {
            $(this).datetimepicker({
                language:  "zh-CN",
                format: "yyyy-mm-dd hh:ii",
                weekStart: 1,
                startDate: "1980-00-00 00:00",
                todayBtn:  "linked",
                autoclose: true,
                todayHighlight: true,
                minView: 0,
                maxView: 4,
                keyboardNavigation: false,
                minuteStep: 10,
                pickerPosition : "bottom-left"
            });
        });
	}()
	// form函数return之前调用，激活针对一些特殊组件进行的一些配置或者修复
	function globalTriggerToGlobalConfig(formHtml) {
		setTimeout(function() {
			// 设置日期组件的格式
			$('[data-form-type="ne"] .form_time').trigger('datetimepicker.load'); // 设置日期插件格式
		}, 0);
	}

	// 创建一个表单
	function createOneForm(item) {
		var $rt = $('<div class="' + getBootstrapGrid(12 / mergedOps.maxcol) + '">');

		var input_type = item.input_type || mergedOps.itemOps.input_type;
		return $rt.append($('<div class="row form-group"></div>').append(createFormFuncMap(item)[input_type]()));
	}

	// 检查用户所传参数的合法性
	function checkOps(ops) {
		var maxcol = ops.maxcol;

		if(!ops.items || !$.isArray(ops.items)) throw new Error('items is required and must be array!');

		if(maxcol > 3 || maxcol < 1) throw new Error('maxcol needs between 1 and 3!');
	}

	// 创建所有表单
	exports.form = function(ops) {
		checkOps(ops); // 检查参数

		// 初始化
		$form = $('<form class="form-horizontal" role="form" data-form-type="ne"></form>');
		var	$wrap = $('<div class="row"></div>');

		// 合并参数
		mergedOps = $.extend(true, {}, defaultOps, $.ne_Util.deleteFilterObject(ops, ['items']));
		// 拼接获取的表单字符串
		ops.items.length > 0 &&
		ops.items.slice(0, ops.items.length).forEach(function(item, index) {
			$wrap.append(createOneForm(item))
		});
		$form.append($wrap); // 拼接完成后一次性插入

		globalTriggerToGlobalConfig();
		return exports;
	}

	// 返回表单，调用者可以将此插入到页面中显示
	exports.getForm = function() {
		// 用户可能会对表单里面的dom进行各种修改，所以不能直接返回$forms
		// 每次返回的都应是最初创建的那个form，所以这里需要做一个副本
		var $clonedForm = $form.clone(true, true);

		// 缓存表单中的组件,其他地方会用到
		$components = $clonedForm.find('[data-input-name]');

		// 返回$clonedForm后用户将表单插入到页面，然后异步激活某些组件绑定的事件
		setTimeout(function() {
			$clonedForm.find('[data-selectType="select2"]').trigger('load.select.neForm');
		}, 0);

		return $clonedForm;
	}

	var $components; // 最终形成的表单中的所有组件
	// 获取一组输入控件的值，如不传入参数，则获取全部组件的值
	// @param: [fieldNames: string[]]
	exports.getFieldsValue = function(fieldNames) {
		var fieldsValue = {},
			fieldValue,
			self = this;

		if((fieldNames === undefined
			&& (fieldNames = [].slice.call($components).map(function(v) {
				return $(v).attr('data-input-name');
			})))
			|| Array.isArray(fieldNames)) {
			fieldNames.forEach(function(name) {
				fieldValue = self.getFieldValue(name);

				if (typeof fieldValue === 'string') { // text, radio, password, single select, multiSelect, date, textarea, switch, slider
					fieldsValue[name] = fieldValue;
				} else if($.isPlainObject(fieldValue)) { // checkbox
					$.each(fieldValue, function(key, v) {
						fieldsValue[key] = v;
					});
				}
			});

			return fieldsValue;
		} else
			throw new Error('fieldNames must be string array!');
	}

	// 不同表单获取值的方法
	var fieldValueFuncMap = {
		text : function($ele) {

			return $ele.val();
		},
		password : function($ele) { // md5进行哈希，后端再加密

			return ;
		},
		radio : function($ele) {

			return $ele.filter(':checked').val();
		},
		checkbox : function($ele) {
			var rt = {};

			$ele.filter(':checked').each(function(i, el) {
				rt[$(this).attr('data-input-name')] = true;
			});

			return rt;
		},
		date : function($ele) {

			return $ele.val();
		},
		switch : function($ele) {

			return ;
		},
		slider : function($ele) {

			return ;
		},
		file : function($ele) { // 暂不实现

			return ;
		},
		textarea : function($ele) { // 暂不实现

			return ;
		},
		singleSelect : function($ele) {
			return $ele.select2('data')[0].text;
		},
		multiSelect: function($ele) {
			var rt = [];

			$.each($ele.select2('data'), function(i, v) {
				rt.push(v.text);
			});

			return rt;
		},
		color : function($ele) {

			return ;
		}
	};

	// 获取某个输入控件的值
	// param: fieldName: string (需与组件上的data-input-name一致)
	exports.getFieldValue = function(fieldName) {
		if(typeof fieldName !== 'string') throw Error('filedName must be string!');

		var $ele = $components.filter('[data-input-name=' + fieldName + ']'),
			type = $ele.attr('data-input-type');

		if(!type)
			throw new Error('data-input-type is required!');

		return fieldValueFuncMap[type]($ele);
	}

	return exports;
}));