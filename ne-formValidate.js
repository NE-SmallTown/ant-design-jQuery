/**
 * ne-formValidate v0.0.1
 *
 * Copyright (c) 2016 NE_SmallTown
 *
 * Date: 2016/9/11
 *
 * 优化/功能 -> 建议：
 * 1.目前基于JQuery-Validate进行封装，以后有机会自己写吧,那个太庞大了，很多没必要
 * 2.JQ validate好坑- -，他要求submit按钮必须要在验证的form表单内。。。。。，不然只会触发按钮的click
 *   事件，不会触发表单的submit事件，所以针对那些submit按钮不在form标签内的，要调用$formWrap.submit()手动触发
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
    window.jQuery.ne_formValidate = factory(window.jQuery);
  }
}(this, function($) {
	"use strict";

	// 要导出的对象
	var exports = {};

	// 默认配置
	var defaultOps = {
		$formWrap: null, // 要验证的表单
		rules: null, // 验证的规则
		messages: null,
		errorClass: 'validate-label-error help-block',
		promptIconInclude: function(element) { // 验证时满足提供的条件才显示图标
			return element.tagName == 'INPUT'; // 默认是只有input标签才显示
		},
		highlight: function() {  // 模态框的输入框不合法时高亮
			return setLight('icon-neformValidate-ok', 'icon-neformValidate-error', defaultOps.promptIconInclude).apply(this, arguments);
		},
		unhighlight: function() { // 模态框的输入框合法时高亮
			return setLight('icon-neformValidate-error', 'icon-neformValidate-ok', defaultOps.promptIconInclude).apply(this, arguments);
		},
		//debug: true, // 只验证,不提交表单

		// 表单各个组件的唯一标识，jqValidate是针对name的，即要求组件上必须有name属性，
		// 但在实际中，我们可能并不会通过name来唯一标识，如ne-form我们就通过data-input-name
		// 来唯一标识
		keyOfName: "name",

		/*errorPlacement: function() { // 更改错误信息显示的位置

		},
		errorContainer: "div.error",
		errorLabelContainer: $("#signupForm div.error"),
		wrapper: "li"*/
		submitHandler: function() {
			console.log('form submit!');
		}
	};

	// 合并后的配置
	var mergedOps;

	// 添加自定义的校验方法，扩展JQ-validate
	(function() {
		// 联系电话(手机/电话皆可)验证
	    jQuery.validator.addMethod("isTel", function(value,element) {
	        var length = value.length;
	        var mobile = /^(((13[0-9]{1})|(15[0-9]{1})|(18[0-9]{1}))+\d{8})$/;
	        var tel = /^(\d{3,4}-?)?\d{7,9}$/g;
	        return this.optional(element) || tel.test(value) || (length==11 && mobile.test(value));
	    }, "请正确填写您的联系方式");

	    // IP地址验证
	    jQuery.validator.addMethod("isIp", function(value, element) {
	      return this.optional(element) || /^(([1-9]|([1-9]\d)|(1\d\d)|(2([0-4]\d|5[0-5])))\.)(([1-9]|([1-9]\d)|(1\d\d)|(2([0-4]\d|5[0-5])))\.){2}([1-9]|([1-9]\d)|(1\d\d)|(2([0-4]\d|5[0-5])))$/.test(value);    
	    }, "请填写正确的IP地址。");

	    // 字符验证，只能包含中文、英文、数字、下划线等字符。
	    jQuery.validator.addMethod("isZh_En_Num__", function(value, element) {
	         return this.optional(element) || /^[a-zA-Z0-9\u4e00-\u9fa5-_]+$/.test(value);
	    }, "只能包含中文、英文、数字、下划线等字符");

	    // 匹配汉字
	    jQuery.validator.addMethod("isZh", function(value, element) {
	         return this.optional(element) || /^[\u4e00-\u9fa5]+$/.test(value);
	    }, "匹配汉字");

	    // 匹配中文(包括汉字和字符)
	    jQuery.validator.addMethod("isZhOrChar", function(value, element) {
	         return this.optional(element) || /^[\u0391-\uFFE5]+$/.test(value);
	    }, "匹配中文(包括汉字和字符) ");

	    // 判断是否包含中英文特殊字符，除英文"-_"字符外
	    jQuery.validator.addMethod("isContainsSpecialChar", function(value, element) {
	         var reg = RegExp(/[(\ )(\`)(\~)(\!)(\@)(\#)(\$)(\%)(\^)(\&)(\*)(\()(\))(\+)(\=)(\|)(\{)(\})(\')(\:)(\;)(\')(',)(\[)(\])(\.)(\<)(\>)(\/)(\?)(\~)(\！)(\@)(\#)(\￥)(\%)(\…)(\&)(\*)(\（)(\）)(\—)(\+)(\|)(\{)(\})(\【)(\】)(\‘)(\；)(\：)(\”)(\“)(\’)(\。)(\，)(\、)(\？)]+/);   
	         return this.optional(element) || !reg.test(value);
	    }, "含有中英文特殊字符");
	}())

	// 校验表单时的高亮设置
	function setLight(rmClass, adClass, promptIconInclude) {
		return function(element) {
			if(promptIconInclude(element)) {
				if($(element).nextAll(".form-control-feedback").length) {
					$(element).nextAll(".form-control-feedback").removeClass(rmClass).addClass(adClass);
				} else {
					$(element).after($("<span class='icon iconfont form-control-feedback " + adClass + "'></span>"));
				}
			}
		};
	}

	// 检查用户所传参数的合法性
	function isUserOpsLegal(userOps) {
		if(userOps.$formWrap[0].tagName != 'FORM') throw new Error('$formWrap must be a form!');
		if(!userOps.rules || !userOps.messages) throw new Error('rules and messages must be required!');

		return true;
	}

	// 因为JQuery-validate必须要求表单组件含有name属性，所以这里根据传入的keyOfName给表单添加name属性
	function addNameToComponents() {
		var keyOfName = mergedOps.keyOfName,
			$form = mergedOps.$formWrap;

		$form.find('[' + keyOfName + ']').attr('name', function() {
			return $(this).attr(keyOfName);
		});
	}

	// 验证的核心函数
	exports.validate = function(userOps) {
		if(isUserOpsLegal(userOps)) {
			mergedOps = $.extend(true, {}, defaultOps, userOps);

			// 如果表单组件里面不是以name来唯一区分组件，那么添加name属性
			mergedOps.keyOfName && addNameToComponents();

			var $formWrap = mergedOps.$formWrap;
			// $formWrap.data('validator')
			// && ($formWrap.data('validator', null), $formWrap.off());
			return $formWrap.validate(mergedOps);
		}
	}

	return exports;
}));
























