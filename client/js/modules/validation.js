/**
 * 数据验证模块
 * 前端表单验证 + 后端数据完整性检查
 */

export function createValidationModule() {
  const rules = {
    name: { required: true, maxLength: 200, message: '项目名称不能为空且不超过200字' },
    location: { maxLength: 100, message: '场地名称不超过100字' },
    director: { maxLength: 50, message: '导演姓名不超过50字' },
    photographer: { maxLength: 50, message: '摄影师姓名不超过50字' },
    production: { maxLength: 50, message: '制片姓名不超过50字' },
    rd: { maxLength: 50, message: '研发姓名不超过50字' },
    operational: { maxLength: 50, message: '运营姓名不超过50字' },
    audio: { maxLength: 50, message: '录音姓名不超过50字' },
    business: { maxLength: 50, message: '商务姓名不超过50字' },
    type: { maxLength: 20, message: '类型不超过20字' },
    startTime: { pattern: /^([01]\d|2[0-3]):[0-5]\d$/, message: '时间格式应为 HH:MM' },
    status: { enum: ['待确认', '已确认', '已完成', '取消'], message: '无效的状态值' }
  };

  function validateField(field, value) {
    const rule = rules[field];
    if (!rule) return { valid: true };

    if (rule.required && (!value || !value.trim())) {
      return { valid: false, message: rule.message };
    }
    if (rule.maxLength && value && value.length > rule.maxLength) {
      return { valid: false, message: rule.message };
    }
    if (rule.pattern && value && !rule.pattern.test(value)) {
      return { valid: false, message: rule.message };
    }
    if (rule.enum && value && !rule.enum.includes(value)) {
      return { valid: false, message: rule.message };
    }
    return { valid: true };
  }

  function validateProject(project) {
    const errors = [];
    Object.keys(rules).forEach(field => {
      const result = validateField(field, project[field]);
      if (!result.valid) {
        errors.push({ field, message: result.message });
      }
    });
    return { valid: errors.length === 0, errors };
  }

  function validateForm(formElement) {
    const errors = [];
    formElement.querySelectorAll('[data-field]').forEach(input => {
      const field = input.dataset.field;
      const result = validateField(field, input.value);
      if (!result.valid) {
        errors.push({ field, message: result.message, element: input });
        input.classList.add('validation-error');
        input.title = result.message;
      } else {
        input.classList.remove('validation-error');
        input.title = '';
      }
    });
    return { valid: errors.length === 0, errors };
  }

  return { validateField, validateProject, validateForm };
}
