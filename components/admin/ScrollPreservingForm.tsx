"use client";

import {
  type ReactNode,
  useActionState,
  useEffect,
  useRef,
} from "react";

type ScrollPreservingFormProps = {
  action: (formData: FormData) => Promise<void>;
  children: ReactNode;
  className?: string;
};

export default function ScrollPreservingForm({
  action,
  children,
  className,
}: ScrollPreservingFormProps) {
  const scrollPosition = useRef(0);
  const submitted = useRef(false);
  const [, formAction, pending] = useActionState(
    async (_state: null, formData: FormData) => {
      await action(formData);
      return null;
    },
    null
  );

  useEffect(() => {
    if (pending || !submitted.current) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({
        top: scrollPosition.current,
        behavior: "auto",
      });
      submitted.current = false;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pending]);

  return (
    <form
      action={formAction}
      className={className}
      aria-busy={pending}
      onSubmit={() => {
        scrollPosition.current = window.scrollY;
        submitted.current = true;
      }}
    >
      {children}
    </form>
  );
}
