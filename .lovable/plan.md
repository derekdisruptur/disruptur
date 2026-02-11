

# Turn Down the Truth Check Sensitivity

**Goal**: Make the Story Coach less trigger-happy -- only flag content when it's clearly performative/corporate, not for minor signals.

## Changes

### 1. Update the System Prompt (check-authenticity edge function)

Add explicit instructions to raise the threshold for flagging:

- Add a **"Sensitivity Calibration"** section to the prompt that tells the AI to only flag when **multiple strong performance signals** are present, not just one or two minor ones
- Add instruction: "Err on the side of letting the user through. Only flag if the text feels overtly performative or reads like marketing copy."
- Add instruction: "Casual, conversational text should always pass, even if imperfect."
- Change the Output Logic to emphasize: "Default to `needsRefinement: false` unless the text is clearly performative"

### 2. Raise the AI Temperature

- Bump `temperature` from `0.3` to `0.2` -- makes the model more deterministic and less likely to over-interpret subtle signals as "performative"

### 3. Fix Stale Fallback

- Line 92 still has the old `{ isAuthentic: true, reason: null }` fallback from the previous version. Update it to `{ needsRefinement: false, softNudge: null }` so it matches the new response format.

---

### Technical Details

**File**: `supabase/functions/check-authenticity/index.ts`

Updated prompt will include a new section like:

```
"Sensitivity": "Set your threshold HIGH. Only return needsRefinement: true when the text has 3+ clear performance signals. A single buzzword or polished sentence is NOT enough. When in doubt, let them through."
```
