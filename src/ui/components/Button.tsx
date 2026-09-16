import type { ComponentChildren, JSX } from 'preact';

export interface ButtonProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'hint';
  size?: 'sm' | 'md' | 'lg';
  kbd?: string;
  children?: ComponentChildren;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

export function Button({ variant = 'secondary', size = 'md', kbd, children, class: cls, type = 'button', ...rest }: ButtonProps) {
  const classes = ['btn', variant !== 'secondary' ? variant : '', size !== 'md' ? size : '', typeof cls === 'string' ? cls : ''].filter(Boolean).join(' ');
  return (
    <button type={type} class={classes} {...rest}>
      {children}
      {kbd ? <span class="kbd-hint">{kbd}</span> : null}
    </button>
  );
}

export function LinkButton({ href, variant = 'secondary', size = 'md', children }: { href: string; variant?: ButtonProps['variant']; size?: ButtonProps['size']; children: ComponentChildren }) {
  const classes = ['btn', variant !== 'secondary' ? variant : '', size !== 'md' ? size : ''].filter(Boolean).join(' ');
  return <a class={classes} href={href}>{children}</a>;
}
