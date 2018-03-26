/**
 * ne-modal v0.0.1
 *
 * Copyright (c) 2016 NE_SmallTown
 *
 * Date: 2016/8/31
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
    window.jQuery.ne_modal = factory(window.jQuery);
  }
}(this, function($) {
	// 添加一些全局配置和扩展
	(function() {
		if(!('animateCss' in $.fn)) {
			$.fn.extend({
			    animateCss: function (animationName, endCallback) {
			        var animationEnd = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';
			        this.addClass('animated ' + animationName).one(animationEnd, function() {
			            $(this).removeClass('animated ' + animationName);
			            endCallback && endCallback();
			        });
			    }
			});
		}
	}())

	// 模态框的各个部分模板
	var templates = {
		dialog:
		  "<div class='ne-modal-mask'></div>" +
	      "<div class='ne-modal-wrap' tabindex='-1' role='dialog'>" +
	        "<div class='ne-modal-dialog'>" +
	          "<div class='ne-modal-content'>" +
	            "<div class='ne-modal-body'>" +
	            "</div>" +
	          "</div>" +
	        "</div>" +
	      "</div>",
	    header:
	      "<div class='ne-modal-header'>" +
	      	"<button type='button' class='ne-modal-close' data-modal-btType='cancel'>" +
	      		"<i class='ne-modal-close-x icon iconfont icon-ne-modal-close'></i>" +
	      	"</button>" +
	        "<div class='ne-modal-title'></div>" +
	      "</div>",
	    footer:
	      "<div class='ne-modal-footer'>" +
			"<button type='button' class='ne-modal-btn ne-modal-btn-ghost ne-btn-lg' data-modal-btType='cancel'>" +
				"<span>返 回</span>" +
			"</button>" +
			"<button class='ne-modal-btn ne-modal-btn-primary ne-btn-lg' data-modal-btType='ensure' type='submit'>" +
				"<span>提 交</span>" +
			"</button>" +
	      "</div>"
	};

	// 设置内容的方法
	var setContent = {
		setCustomContent : function() {
			return $(templates.dialog).find('.ne-modal-body')
					.append(mergedOps.bodyHtml)
					.before($(templates.header).find('.ne-modal-title').text(mergedOps.customTitle).end())
					.after(templates.footer)
					.end();
		},
		setConfirmContent : function() {
	    	var rt =
		    	'<div style="zoom: 1;overflow: hidden;">' +
		    		'<div class="ne-modal-body">' +
		    			'<i class="icon iconfont ne-modal-ticon icon-' + mergedOps.iconName + '"></i>' +
		    			'<span class="ne-confirm-title">' + mergedOps.confirmTitle + '</span>' +
		    			'<div class="ne-confirm-content">' + mergedOps.confirmContent + '</div>' +
		    		'</div>' +
			    	'<div class="ne-modal-btns">' +
			    		(mergedOps.cancelText ? '<button type="button" class="ne-modal-btn ne-modal-btn-ghost ne-modal-btn-lg" data-modal-btType="cancel">' +
			    			'<span>' + mergedOps.cancelText + '</span>' +
			    		'</button>' : '') +
			    		'<button type="button" class="ne-modal-btn ne-modal-btn-primary ne-btn-lg" data-modal-btType="ensure">' +
			    			'<span>' + mergedOps.ensureText + '</span>' +
			    		'</button>' +
			    	'</div>' +
		    	'</div>';

		    return $(templates.dialog).find('.ne-modal-body').append(rt).end();
	    }
	};

	// 默认配置
	var defaultOps = {
		_common: { // 各种模态框都包含的属性
			ensureCallback: function() {
				modalObj._hide();
			},
			cancelCallback: function() {
				modalObj._hide();
			},
			disableMaskClick: false, // 是否禁用遮罩上的点击事件，禁用后点击遮罩不会关闭模态框
			animate: { // 动画相关配置

			}
		},

		// **********alert配置********
		alert: {

		},

		// **********info配置********
		// @param {string} [cancelText='确定'] - 取消按钮上显示的文字
		// @param {boolean} [hasMask=false] - 是否显示遮罩
		info: {
			ensureText: '确定',
			hasMask: false
		},

		// **********confirm配置********
		// @description confirm默认配置
		// @param {string} [iconName='info'] - confirm标题左方的图标的code名
		// @param {string} confirmTitle='我是confirm的标题' - confirm的标题, 与icon在同一行
		// @param {string} confirmContent - confirm的内容
		// @param {string} [cancelText='确定'] - 取消按钮上显示的文字
		// @param {string} [ensureText='取消'] - 确认按钮上显示的文字
		confirm: $.extend(true, {}, this._common, {
			ensureText: '确定',
			cancelText: '取消',
			iconName: 'ne-modal-info',
			confirmTitle: '我是confirm的标题'
		}),

		// **********custom配置********
		// @description custom默认配置
		// @param {string} bodyHtml - modal的body部分的html
		custom: {
			customTitle: '我是custom的标题'
		}
	};

	var modalObj, mergedOps, $modal_wrap;
	// 构造函数
	function NE_Modal() {
		modalObj = this;
	}

	// ***************用户模块××××××××××××××
	// 弹出消息框(只包含内容)
	NE_Modal.prototype.alert = function(ops) {

		unifyExport.call(this);
	}

	// 弹出展示信息的消息框(普通，成功，失败，警告)
	NE_Modal.prototype.info = function(ops) {
		var iconName;
		switch(ops.type) {
			case 'normal':
				iconName = 'ne-modal-info';
				break;
			case 'success':
				iconName = 'ne-modal-success';
				break;
			case 'failure':
				iconName = 'ne-modal-fail';
				break;
			case 'warning':
				iconName = 'ne-modal-warning';
				break;
			default:
				throw new Error("type must be normal/success/failure/warning");
		}

		mergedOps = $.extend(true, {}, defaultOps.info, ops);
		mergedOps.iconName = iconName;
		$modal_wrap = setContent.setConfirmContent();

		// 这里不直接通过filter然后再remove的原因是元素没有被插入文档中,是删除不掉的.
		// 因为JQ要求被remove的元素必须有父级，如果插入了文档中,那么这是肯定的，但是
		// 自己创建的元素的最顶级是没有父级的，他没有考虑到这种情况
		// 可以先wrap,然后remove之后再unwrap,那样太麻烦了,采取下面这种办法
		// $modal_wrap = $modal_wrap.filter('.ne-modal-wrap')
		!mergedOps.hasMask && ($modal_wrap = $modal_wrap.filter('.ne-modal-wrap'));
		unifyExport.call(this);
	}

	// 弹出带有取消和确认的消息框
	NE_Modal.prototype.confirm = function(ops) {
		mergedOps = $.extend(true, {}, defaultOps.confirm, ops);
		$modal_wrap = setContent.setConfirmContent();

		unifyExport.call(this);
	}

	// 弹出自定义的消息框
	NE_Modal.prototype.custom = function(ops) {
		mergedOps = $.extend(true, {}, defaultOps.custom, ops);
		$modal_wrap = setContent.setCustomContent();

		unifyExport.call(this);
	}

	// ***************功能模块××××××××××××××
	// 统一出口
	function unifyExport() {
		setModalEvents();
		this._setUserCss();
		$modal_wrap.filter('.ne-modal-wrap').animateCss('zoomIn');
		this._show();

		return this;
	}
	// 对某些特定的标签设置css
	NE_Modal.prototype._setUserCss = function() {
		// 用户根据实际情况自己确定模态框的大小
		$modal_wrap.find('.ne-modal-dialog').css(mergedOps.modalStyle);

		return this;
	}

	// 显示消息框
	NE_Modal.prototype._show = function() {
		$('body').append($modal_wrap);

		return this;
	}

	// 移除消息框
	NE_Modal.prototype._hide = function() {
		$modal_wrap.filter('.ne-modal-mask').remove();
		$modal_wrap.filter('.ne-modal-wrap').animateCss('zoomOut', function() {
			$modal_wrap.remove();
			mergedOps.cancelCallback && mergedOps.cancelCallback();
		});

		return this;
	}

	// 确认按钮被点击
	NE_Modal.prototype._ensure = function() {
		if(mergedOps.ensureCallback && mergedOps.ensureCallback.call(this) == true)
			return this._hide();
	}

	// 进行与模态框有关的一些事件的配置
	function setModalEvents() {
		// 点击遮罩层
		$modal_wrap.on('click', '.ne-modal-wrap', function(e) {
			mergedOps.disableMaskClick || e.target === $modal_wrap.filter('.ne-modal-wrap')[0] && modalObj._hide();
		});

		// 点击右上角的X按钮或者取消按钮
		$modal_wrap.on('click', '[data-modal-btType="cancel"]', function(e) {
			modalObj._hide();
		});

		// 点击确认按钮
		$modal_wrap.on('click', '[data-modal-btType="ensure"]', function(e) {
			$(this).parent().children('[data-modal-bttype]').length == 1 ? // 如果只有一个按钮，则点击该按钮应该隐藏
			modalObj._hide() : modalObj._ensure();

			return false;
		});
	}

	return new NE_Modal();
}));