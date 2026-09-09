import { useAuth } from "../context/AuthContext.jsx";

/**
 * Custom hook to access authentication context.
 * Standardizes hook imports from the /hooks directory.
 *
 * @returns {{
 *   user: Object|null,
 *   isLoading: boolean,
 *   authError: string|null,
 *   login: Function,
 *   signup: Function,
 *   logout: Function,
 *   updateProfile: Function,
 *   refreshSession: Function
 * }}
 */
export { useAuth };
export default useAuth;
