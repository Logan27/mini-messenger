Fix: Normalize backend user-search response in `GlobalUserSearch`.

Problem
- The frontend expected `/api/users/search` to return an array (response.data.data or response.data.users), but the backend wraps results in an object: `data: { users: [...], pagination: {...}, search: {...} }`.
- Because the UI attempted to map over `response.data.data` directly, no results were shown when the backend returned the wrapped object.

Fix
- `frontend/src/components/GlobalUserSearch.tsx`: normalize `response.data` into a `users` array and extract pagination info (`totalResults`, `hasNextPage`) from the returned payload.

How to verify
- Open the app and click the global search icon. Type at least 2 characters.
- The matching users returned by the API should now be listed, and "Add contact" will work and mark them as added.

If you still don't see results
- Ensure the frontend dev server (Vite) is running and picked up the file change. If not, restart the frontend with:

```powershell
cd frontend
npm run dev
```

- Check browser console for errors and the network tab POST/GET to `/api/users/search` to confirm response shape.
