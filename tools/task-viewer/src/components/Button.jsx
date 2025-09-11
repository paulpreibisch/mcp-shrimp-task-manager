import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';

/**
 * Consistent Button component with multiple variants and sizes
 * Supports icons, accessibility, and hover states
 */
const Button = forwardRef(({ 
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  style = {},
  icon,
  iconPosition = 'left',
  'aria-label': ariaLabel,
  title,
  ...props
}, ref) => {
  
  // Base styles that apply to all buttons
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    textDecoration: 'none',
    fontFamily: 'inherit',
    gap: icon ? '6px' : '0',
    opacity: disabled ? 0.5 : 1,
    userSelect: 'none',
    ...style
  };

  // Size configurations
  const sizeStyles = {
    small: {
      padding: '4px 12px',
      fontSize: '11px',
      height: '28px'
    },
    medium: {
      padding: '6px 16px',
      fontSize: '13px',
      height: '36px'
    },
    large: {
      padding: '8px 24px',
      fontSize: '14px',
      height: '44px'
    }
  };

  // Variant configurations
  const variantStyles = {
    primary: {
      backgroundColor: '#3182ce',
      color: 'white',
      border: '1px solid #3182ce'
    },
    secondary: {
      backgroundColor: '#4a5568',
      color: 'white',
      border: '1px solid #4a5568'
    },
    danger: {
      backgroundColor: '#dc2626',
      color: 'white',
      border: '1px solid #dc2626'
    },
    success: {
      backgroundColor: '#10b981',
      color: 'white',
      border: '1px solid #10b981'
    },
    outline: {
      backgroundColor: 'transparent',
      color: '#63b3ed',
      border: '1px solid #63b3ed'
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#cbd5e1',
      border: '1px solid transparent'
    }
  };

  // Hover styles for each variant
  const getHoverStyles = (variant) => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: '#2c5282' };
      case 'secondary':
        return { backgroundColor: '#2d3748' };
      case 'danger':
        return { backgroundColor: '#b91c1c' };
      case 'success':
        return { backgroundColor: '#059669' };
      case 'outline':
        return { backgroundColor: '#63b3ed', color: 'white' };
      case 'ghost':
        return { backgroundColor: 'rgba(203, 213, 225, 0.1)' };
      default:
        return {};
    }
  };

  // Combine all styles
  const buttonStyles = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant]
  };

  // Handle mouse events for hover effects
  const handleMouseEnter = (e) => {
    if (!disabled) {
      const hoverStyles = getHoverStyles(variant);
      Object.assign(e.target.style, hoverStyles);
    }
  };

  const handleMouseLeave = (e) => {
    if (!disabled) {
      const originalStyles = variantStyles[variant];
      Object.assign(e.target.style, originalStyles);
    }
  };

  const handleClick = (e) => {
    if (!disabled && onClick) {
      onClick(e);
    }
  };

  return (
    <button
      ref={ref}
      type={type}
      className={className}
      style={buttonStyles}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
      {...props}
    >
      {icon && iconPosition === 'left' && (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          {icon}
        </span>
      )}
      {children && (
        <span>{children}</span>
      )}
      {icon && iconPosition === 'right' && (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          {icon}
        </span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

Button.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'success', 'outline', 'ghost']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  className: PropTypes.string,
  style: PropTypes.object,
  icon: PropTypes.node,
  iconPosition: PropTypes.oneOf(['left', 'right']),
  'aria-label': PropTypes.string,
  title: PropTypes.string
};

export default Button;