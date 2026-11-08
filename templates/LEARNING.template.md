# Learning Cravins

Plain-language notes for Clarke, one entry per feature, newest at the top. Written with `pstack-teach` and checked with `pstack-unslop`.

---

## YYYY-MM-DD · <feature name> (BUILD.md box <n.n>)

**What we built**
One or two sentences a guest or an owner would understand.

**How it works**
Short steps, or a small diagram:
```
guest taps Pay → app asks the server for a quote → server asks Paystack → phone shows the approval prompt
```

**Files to look at**
- `src/features/<feature>/<file>.ts`: what it does, in one line

**New idea: <name>**
Explain one concept in everyday words, with an example from this feature (for example: "A state machine is a list of the steps something can be in, and which step can follow which.")

**Try it yourself**
One small change Clarke can make and see, such as "Change the tip options in `tips.ts` to 0, 10, 20 and run `npm test`."
