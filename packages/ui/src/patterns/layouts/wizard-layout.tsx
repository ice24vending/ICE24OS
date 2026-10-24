"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { Banner } from "../../components/base/banner.js";
import { Button, ButtonLink } from "../../components/base/button.js";
import { Icon } from "../../components/base/icon.js";
import { cx } from "../../components/base/shared.js";
import { PageHeader } from "./page-header.js";

export interface WizardStep {
  readonly id: string;
  readonly label: string;
  readonly content: ReactNode;
  /** Problems that block «Siguiente» (empty when the step is valid). Checked on the client only
   * to guide the person; the server validates again on submit. */
  readonly validate?: (() => readonly string[]) | undefined;
}

export interface WizardLayoutProps {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly steps: readonly WizardStep[];
  /** Final review shown as the last step (UI_UX §11.6 «Revisión»). */
  readonly summary: ReactNode;
  readonly onFinish: () => void;
  readonly finishLabel?: string;
  /** The finish request is running: the button cannot send it twice. */
  readonly finishing?: boolean | undefined;
  /** Why finishing is not possible (read-only, offline); the button explains it. */
  readonly finishDisabledReason?: string | undefined;
  readonly cancelHref?: string | undefined;
  /** «Regresar» to where the viewer came from (F6-11); see PageHeader. */
  readonly backHref?: string | undefined;
  readonly banner?: ReactNode;
  /** A global state (SystemState) that replaces the current step. */
  readonly status?: ReactNode;
  readonly className?: string | undefined;
}

const REVIEW_LABEL = "Revisión";

/**
 * Step-by-step flow (F6-09, UI_UX §11.6): steps with their state, progress, previous/next with
 * per-step validation and a final summary. Focus moves to the step title on every change.
 */
export function WizardLayout({
  title,
  description,
  steps,
  summary,
  onFinish,
  finishLabel = "Enviar",
  finishing = false,
  finishDisabledReason,
  cancelHref,
  backHref,
  banner,
  status,
  className,
}: WizardLayoutProps) {
  const [current, setCurrent] = useState(0);
  const [errors, setErrors] = useState<readonly string[]>([]);
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const total = steps.length + 1;
  const reviewing = current === steps.length;
  const step = steps[current];

  useEffect(() => {
    if (moved.current) heading.current?.focus();
  }, [current]);

  const go = (index: number) => {
    moved.current = true;
    setErrors([]);
    setCurrent(index);
  };
  const next = () => {
    const problems = step?.validate?.() ?? [];
    if (problems.length > 0) {
      setErrors(problems);
      moved.current = true;
      heading.current?.focus();
      return;
    }
    go(current + 1);
  };

  const labels = [...steps.map((item) => item.label), REVIEW_LABEL];
  return (
    <div className={cx("ids-layout ids-wizard-layout", className)}>
      <PageHeader title={title} description={description} backHref={backHref} />
      {banner}
      <div className="ids-wizard-layout__progress">
        <p className="ids-wizard-layout__count">
          Paso {current + 1} de {total}
        </p>
        <progress value={current + 1} max={total} aria-label={`Paso ${current + 1} de ${total}`} />
        <ol className="ids-wizard-steps">
          {labels.map((label, index) => {
            const state = index < current ? "done" : index === current ? "current" : "pending";
            return (
              <li
                key={label}
                className="ids-wizard-steps__item"
                data-state={state}
                aria-current={state === "current" ? "step" : undefined}
              >
                <span className="ids-wizard-steps__marker" aria-hidden="true">
                  {state === "done" ? <Icon name="check" size={16} /> : index + 1}
                </span>
                {state === "done" ? (
                  <button
                    type="button"
                    className="ids-wizard-steps__link"
                    onClick={() => go(index)}
                  >
                    {label}
                    <span className="ids-visually-hidden"> (completado, volver a este paso)</span>
                  </button>
                ) : (
                  <span>
                    {label}
                    <span className="ids-visually-hidden">
                      {state === "current" ? " (paso actual)" : " (pendiente)"}
                    </span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      {status ?? (
        <section className="ids-wizard-layout__step" aria-labelledby={headingId}>
          <h2 id={headingId} ref={heading} tabIndex={-1} className="ids-wizard-layout__step-title">
            {reviewing ? REVIEW_LABEL : step?.label}
          </h2>
          {errors.length > 0 && (
            <Banner
              tone="danger"
              role="alert"
              title="Revisa este paso antes de continuar"
              titleAs="p"
            >
              <ul>
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </Banner>
          )}
          <div className="ids-wizard-layout__content">{reviewing ? summary : step?.content}</div>
        </section>
      )}
      <div className="ids-wizard-layout__actions">
        {cancelHref && (
          <ButtonLink href={cancelHref} variant="tertiary">
            Cancelar
          </ButtonLink>
        )}
        {current > 0 && (
          <Button variant="secondary" icon="chevron-left" onClick={() => go(current - 1)}>
            Anterior
          </Button>
        )}
        {reviewing ? (
          <Button
            onClick={onFinish}
            loading={finishing}
            loadingLabel="Enviando…"
            disabledReason={finishDisabledReason}
          >
            {finishLabel}
          </Button>
        ) : (
          <Button icon="chevron-right" iconPosition="end" onClick={next}>
            Siguiente
          </Button>
        )}
      </div>
    </div>
  );
}
