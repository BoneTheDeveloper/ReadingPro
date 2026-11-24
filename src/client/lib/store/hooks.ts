import { useDispatch, useSelector } from "react-redux";
import type { AppState, makeStore } from "./store";

export const useAppSelector = useSelector.withTypes<AppState>();
export const useAppDispatch = useDispatch.withTypes<ReturnType<typeof makeStore>["dispatch"]>();
