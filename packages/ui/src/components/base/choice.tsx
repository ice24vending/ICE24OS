"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  type ComponentPropsWithRef,
  type MouseEvent,
  type ReactNode,
} from "react";

import { FieldError, FieldHelp, RequiredMark, type FieldProps } from "./field.js";
import { Icon } from "./icon.js";
import { cx, describedBy } from "./shared.js";

type NativeInput = Omit<ComponentPropsWithRef<"input">, "type" | "size" | keyof FieldProps>;

/** A read-only native checkbox or radio ignores clicks (and Space) but keeps focus. */
const blockWhenReadOnly =
  (readOnly: boolean | undefined, onClick?: (event: MouseEvent<HTMLInputElement>) => void) =>
  (event: MouseEvent<HTMLInputElement>) => {
    if (readOnly) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

export interface CheckboxProps extends Omit<FieldProps, "hideLabel">, NativeInput {
  /** Mixed state, e.g. "select all" with some rows selected. */
  readonly indeterminate?: boolean;
}

/**
 * Checkbox with its label on the right; the whole row is a 44 px touch target (UI_UX §13.2
 * "Checklist").
 */
export function Checkbox({
  label,
  help,
  error,
  required,
  readOnly,
  disabled,
  id,
  className,
  indeterminate = false,
  onClick,
  onChange,
  "aria-describedby": ariaDescribedBy,
  ...rest
}: CheckboxProps) {
  const generated = useId();
  const base = id ?? generated;
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (input.current) input.current.indeterminate = indeterminate;
  }, [indeterminate]);
  const helpId = help ? `${base}-help` : undefined;
  const errorId = error ? `${base}-error` : undefined;
  return (
    <div
      className={cx(
        "ids-choice",
        error && "ids-choice--invalid",
        readOnly && "ids-choice--readonly",
        disabled && "ids-choice--disabled",
        className,
      )}
    >
      <label className="ids-choice__row" htmlFor={base}>
        <span className="ids-choice__control">
          <input
            ref={input}
            id={base}
            type="checkbox"
            className="ids-choice__input"
            required={required}
            disabled={disabled}
            aria-readonly={readOnly || undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(ariaDescribedBy, helpId, errorId)}
            onClick={blockWhenReadOnly(readOnly, onClick)}
            onChange={readOnly ? undefined : onChange}
            {...rest}
          />
          <span className="ids-checkbox__box" aria-hidden>
            <Icon
              name={indeterminate ? "minus" : "check"}
              size={16}
              className="ids-checkbox__mark"
            />
          </span>
        </span>
        <span className="ids-choice__label">
          {label}
          {required && <RequiredMark />}
        </span>
      </label>
      {help && <FieldHelp id={helpId}>{help}</FieldHelp>}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

export interface SwitchProps extends Omit<FieldProps, "hideLabel" | "required">, NativeInput {
  /** Text next to the track for each state, so the state is not shown by color alone. */
  readonly onText?: string;
  readonly offText?: string;
}

/**
 * On/off setting that applies immediately (a checkbox with `role="switch"`). For choices that
 * are submitted with a form, use Checkbox.
 */
export function Switch({
  label,
  help,
  error,
  readOnly,
  disabled,
  id,
  className,
  onText = "Activado",
  offText = "Desactivado",
  onClick,
  onChange,
  "aria-describedby": ariaDescribedBy,
  ...rest
}: SwitchProps) {
  const generated = useId();
  const base = id ?? generated;
  const helpId = help ? `${base}-help` : undefined;
  const errorId = error ? `${base}-error` : undefined;
  return (
    <div
      className={cx(
        "ids-choice",
        "ids-switch",
        error && "ids-choice--invalid",
        readOnly && "ids-choice--readonly",
        disabled && "ids-choice--disabled",
        className,
      )}
    >
      <label className="ids-choice__row" htmlFor={base}>
        <span className="ids-choice__label">{label}</span>
        <span className="ids-switch__control">
          <input
            id={base}
            type="checkbox"
            role="switch"
            className="ids-choice__input"
            disabled={disabled}
            aria-readonly={readOnly || undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(ariaDescribedBy, helpId, errorId)}
            onClick={blockWhenReadOnly(readOnly, onClick)}
            onChange={readOnly ? undefined : onChange}
            {...rest}
          />
          <span className="ids-switch__track" aria-hidden>
            <span className="ids-switch__thumb">
              <Icon name="check" size={16} className="ids-switch__mark" />
            </span>
          </span>
          <span className="ids-switch__state ids-switch__state--on" aria-hidden>
            {onText}
          </span>
          <span className="ids-switch__state ids-switch__state--off" aria-hidden>
            {offText}
          </span>
        </span>
      </label>
      {help && <FieldHelp id={helpId}>{help}</FieldHelp>}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

interface RadioGroupContext {
  readonly name: string;
  readonly value: string | undefined;
  /** Initial selection of an uncontrolled group, for `options` and Radio children alike. */
  readonly defaultValue: string | undefined;
  readonly readOnly: boolean;
  readonly disabled: boolean;
  readonly required: boolean;
  readonly describedBy: string | undefined;
  readonly onChange: ((value: string) => void) | undefined;
}

const RadioContext = createContext<RadioGroupContext | null>(null);

export interface RadioProps extends NativeInput {
  readonly value: string;
  readonly label: ReactNode;
  /** Short explanation under the option (e.g. why it is disabled). */
  readonly description?: ReactNode;
  readonly disabled?: boolean | undefined;
  readonly id?: string | undefined;
  readonly className?: string | undefined;
}

/** One option of a RadioGroup. Arrow keys move between options (native radio behavior). */
export function Radio({ value, label, description, disabled, id, className, ...rest }: RadioProps) {
  const group = useContext(RadioContext);
  const generated = useId();
  const base = id ?? generated;
  const descriptionId = description ? `${base}-description` : undefined;
  const controlled = group?.value !== undefined;
  return (
    <div className={cx("ids-choice", "ids-radio", className)}>
      <label className="ids-choice__row" htmlFor={base}>
        <span className="ids-choice__control">
          <input
            id={base}
            type="radio"
            className="ids-choice__input"
            name={group?.name}
            value={value}
            required={group?.required}
            disabled={disabled || group?.disabled}
            aria-describedby={describedBy(descriptionId, group?.describedBy)}
            onClick={blockWhenReadOnly(group?.readOnly)}
            onKeyDown={(event) => {
              // Arrow keys would move the selection of a read-only group.
              if (group?.readOnly && event.key.startsWith("Arrow")) event.preventDefault();
            }}
            {...(controlled
              ? { checked: group.value === value, onChange: () => group.onChange?.(value) }
              : {
                  ...(group?.defaultValue !== undefined
                    ? { defaultChecked: group.defaultValue === value }
                    : {}),
                  onChange: () => group?.onChange?.(value),
                })}
            {...rest}
          />
          <span className="ids-radio__dot" aria-hidden />
        </span>
        <span className="ids-choice__label">{label}</span>
      </label>
      {description && (
        <p id={descriptionId} className="ids-choice__description">
          {description}
        </p>
      )}
    </div>
  );
}

export interface RadioGroupProps extends Omit<FieldProps, "hideLabel"> {
  readonly name: string;
  readonly options?: readonly (Omit<RadioProps, "name"> & { readonly value: string })[];
  readonly value?: string | undefined;
  readonly defaultValue?: string | undefined;
  readonly onChange?: (value: string) => void;
  readonly orientation?: "vertical" | "horizontal";
  readonly children?: ReactNode;
}

/**
 * Group of mutually exclusive options with a visible legend. Pass `options`, or Radio children
 * for custom content.
 */
export function RadioGroup({
  label,
  help,
  error,
  required = false,
  readOnly = false,
  disabled = false,
  id,
  className,
  name,
  options,
  value,
  defaultValue,
  onChange,
  orientation = "vertical",
  children,
}: RadioGroupProps) {
  const generated = useId();
  const base = id ?? generated;
  const helpId = help ? `${base}-help` : undefined;
  const errorId = error ? `${base}-error` : undefined;
  const context: RadioGroupContext = {
    name,
    // Read-only groups are controlled, so a cancelled click cannot leave them half-changed.
    value: readOnly ? (value ?? defaultValue) : value,
    defaultValue,
    readOnly,
    disabled,
    required,
    describedBy: describedBy(helpId, errorId),
    onChange: readOnly ? undefined : onChange,
  };
  return (
    <fieldset
      id={base}
      role="radiogroup"
      className={cx(
        "ids-radio-group",
        `ids-radio-group--${orientation}`,
        error && "ids-choice--invalid",
        readOnly && "ids-choice--readonly",
        className,
      )}
      aria-required={required || undefined}
      aria-readonly={readOnly || undefined}
      aria-invalid={error ? true : undefined}
      disabled={disabled}
    >
      <legend className="ids-field__label">
        {label}
        {required && <RequiredMark />}
      </legend>
      {help && <FieldHelp id={helpId}>{help}</FieldHelp>}
      <div className="ids-radio-group__options">
        <RadioContext.Provider value={context}>
          {options?.map((option) => (
            <Radio key={option.value} {...option} />
          ))}
          {children}
        </RadioContext.Provider>
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </fieldset>
  );
}
