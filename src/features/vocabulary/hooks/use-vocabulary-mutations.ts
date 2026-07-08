"use client";

import { useActionState } from "react";
import {
  updateVocabularyStatusAction,
  deleteVocabularyItemAction,
  createVocabularySetAction,
  deleteVocabularySetAction,
} from "../actions";
import type { VocabularyStatus } from "../schemas/vocabulary.schema";

// ============== Types ==============

type ActionState<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

const initialState: ActionState = { success: false };

// ============== Vocabulary Item Mutations ==============

export function useUpdateVocabularyStatus() {
  const [state, formAction, isPending] = useActionState<
    ActionState,
    FormData
  >(
    async (prevState, formData) => {
      try {
        const itemId = formData.get("itemId") as string;
        const status = formData.get("status") as VocabularyStatus;

        const result = await updateVocabularyStatusAction({ itemId, status });
        return { success: true, data: result.data };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to update status",
        };
      }
    },
    initialState
  );

  return { state, formAction, isPending };
}

export function useDeleteVocabularyItem() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    async (prevState, formData) => {
      try {
        const itemId = formData.get("itemId") as string;
        await deleteVocabularyItemAction(itemId);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to delete item",
        };
      }
    },
    initialState
  );

  return { state, formAction, isPending };
}

// ============== Vocabulary Set Mutations ==============

export function useCreateVocabularySet() {
  const [state, formAction, isPending] = useActionState<
    ActionState,
    FormData
  >(
    async (prevState, formData) => {
      try {
        const name = formData.get("name") as string;
        const result = await createVocabularySetAction({ name });
        return { success: true, data: result.data };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create set",
        };
      }
    },
    initialState
  );

  return { state, formAction, isPending };
}

export function useDeleteVocabularySet() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    async (prevState, formData) => {
      try {
        const setId = formData.get("setId") as string;
        await deleteVocabularySetAction({ setId });
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to delete set",
        };
      }
    },
    initialState
  );

  return { state, formAction, isPending };
}
