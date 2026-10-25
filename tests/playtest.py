"""Full play test of BigMike at iPhone size. Prints PASS/FAIL per check and screenshots key screens."""
import asyncio, json, os, sys, time
from playwright.async_api import async_playwright

URL = "http://localhost:8765/"
SP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
os.makedirs(SP, exist_ok=True)
results = []
errors = []


def check(name, cond, detail=""):
    results.append((bool(cond), name, detail))
    print(("PASS " if cond else "FAIL ") + name + (f"  [{detail}]" if detail and not cond else ""), flush=True)


async def ev(pg, js):
    return await pg.evaluate(js)


async def shot(pg, name, full=False):
    await pg.screenshot(path=f"{SP}/{name}.png", full_page=full)


async def no_overflow(pg, where):
    w = await ev(pg, "document.documentElement.scrollWidth - window.innerWidth")
    check(f"no sideways scroll: {where}", w <= 1, f"overflow {w}px")


async def toast(pg):
    return await ev(pg, "document.querySelector('#toast').classList.contains('show') ? document.querySelector('#toast').textContent : ''")


async def done_set(pg, w=None, r=None, skip_rest=True):
    if w is not None:
        await pg.fill("[data-in=w]", str(w))
    if r is not None:
        await pg.fill("[data-in=r]", str(r))
    await pg.click("[data-a=doneSet]")
    if skip_rest and await pg.locator(".rest-page [data-a=restSkip]").count():
        await pg.click(".rest-page [data-a=restSkip]")


async def finish_all(pg, w=50, r=12):
    """Logs every remaining set with the given numbers (keeps the prefilled weight when there is one)."""
    for _ in range(80):
        if await pg.locator("[data-a=doneSet]").count() == 0:
            break
        cur = await pg.input_value("[data-in=w]")
        await done_set(pg, None if cur else w, r)


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, accept_downloads=True)
        pg = await ctx.new_page()
        pg.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
        pg.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)
        pg.on("dialog", lambda d: (errors.append("native dialog used: " + d.message), asyncio.ensure_future(d.dismiss())))

        # ---------------- 1. setup ----------------
        await pg.goto(URL)
        check("setup screen shows", await pg.locator("#setupW").count() == 1)
        check("tab bar hidden during setup", await pg.locator("#tabs").is_hidden())
        await pg.click("[data-a=finishSetup]")
        check("setup rejects empty weight", "weight" in (await toast(pg)).lower())
        await pg.fill("#setupW", "20")
        await pg.click("[data-a=finishSetup]")
        check("setup rejects silly weight", await pg.locator("#setupW").count() == 1)
        await pg.fill("#setupW", "138")
        await pg.click("[data-a=finishSetup]")
        check("setup saves weight", await ev(pg, "S.profile.weight") == 138)
        check("protein target 0.8 g/lb", await ev(pg, "proteinTarget()") == 110)
        await shot(pg, "01_today")
        await no_overflow(pg, "today")

        # ---------------- 2. today ----------------
        check("sleep card shows on first open", await pg.locator("[data-a=skipSleep]").count() == 1)
        await pg.click("[data-a=adj][data-k=sleepH][data-d='1']")
        await pg.click("[data-a=sleepQ][data-q=Great]")
        await pg.click("[data-a=saveSleep]")
        check("sleep saved 8h Great", await ev(pg, "JSON.stringify(S.sleep[ymd()])") == '{"h":8,"q":"Great"}')
        check("sleep card gone after save", await pg.locator("[data-a=skipSleep]").count() == 0)
        await pg.reload()
        check("sleep card stays gone after reopening", await pg.locator("[data-a=skipSleep]").count() == 0)
        check("next up is Push A", "Push A" in await pg.inner_text("[data-a=start]"))
        check("other 5 days offered", await pg.locator("[data-a=startDay]").count() == 5)
        await pg.click("[data-a=previewDay]")
        check("day preview lists 6 lifts", await pg.locator(".sheet-card .plain li").count() == 6)
        await pg.click(".sheet-x")
        await pg.click("[data-a=addP][data-g='25']") if await pg.locator("[data-a=addP]").count() else None
        await pg.click("[data-a=go][data-v=today]")

        # ---------------- 3. first workout (Push A) ----------------
        await pg.click("[data-a=start]")
        check("energy sheet asks", await pg.locator("[data-a=energy]").count() == 3)
        await pg.click("[data-e=normal]")
        await shot(pg, "02_set_first")
        await no_overflow(pg, "set screen")
        check("tabs hidden in workout", await pg.locator("#tabs").is_hidden())
        check("set screen: name", (await pg.inner_text(".exname")) == "Barbell Bench Press")
        check("set screen: set 1 of 3", "SET 1 OF 3" in (await pg.inner_text(".eyebrow-set")).upper())
        check("first-time hint", "First time" in await pg.inner_text(".focus"))
        check("no 'last time' on first session", await pg.locator(".lastline").count() == 0)
        await pg.click("[data-a=doneSet]")
        check("weight required on first set", "weight" in (await toast(pg)).lower())
        # steppers
        await pg.click("[data-a=adj][data-k=w][data-d='1']")
        check("weight + from empty starts at bar (45)", await pg.input_value("[data-in=w]") == "45")
        for _ in range(4):
            await pg.click("[data-a=adj][data-k=w][data-d='1']")
        check("weight steps by 5", await pg.input_value("[data-in=w]") == "65")
        check("plates shown for barbell", "10 + 0" not in await pg.inner_text(".focus") and "per side" in await pg.inner_text(".focus"))
        check("warm-ups suggested", await pg.locator("[data-a=wu]").count() >= 2)
        await pg.click("[data-a=wu] >> nth=0")
        check("warm-up chip ticks", "on" in (await pg.get_attribute("[data-a=wu] >> nth=0", "class")))
        await pg.click("[data-a=adj][data-k=r][data-d='-1']")
        check("reps stepper", await pg.input_value("[data-in=r]") == "9")
        await pg.click("[data-a=toggleHow]")
        check("how-to opens", await pg.locator(".how-body").count() == 1)
        check("how-to has demo link", "youtube.com" in (await pg.get_attribute(".how-body a", "href")))
        await pg.click("[data-a=toggleHow]")
        check("how-to closes", await pg.locator(".how-body").count() == 0)
        await pg.fill("[data-in=r]", "10")
        await pg.click("[data-a=doneSet]")
        await shot(pg, "03_rest")
        check("rest page shows", await pg.locator(".rest-page").count() == 1)
        check("rest shows next set", "set 2 of 3" in await pg.inner_text(".next-up"))
        check("rest shows target", "65 lb × 10" in await pg.inner_text(".aim"))
        t0 = await ev(pg, "S.cur.restEnd")
        await pg.click("[data-a=restAdd][data-s='30']")
        check("+30s adds 30 s", abs(await ev(pg, "S.cur.restEnd") - t0 - 30000) < 50)
        await pg.click("[data-a=restAdd][data-s='-15']")
        check("-15s removes 15 s", abs(await ev(pg, "S.cur.restEnd") - t0 - 15000) < 50)
        # rest runs out on its own
        await ev(pg, "S.cur.restEnd = Date.now() + 1200; save()")
        await pg.wait_for_timeout(1800)
        check("time's up state", "TIME'S UP" in (await pg.inner_text(".eyebrow-set")).upper())
        check("screen flashes when rest ends", await ev(pg, "document.body.classList.contains('flash')"))
        await shot(pg, "04_times_up")
        await pg.click("[data-a=restSkip]")
        check("start set returns to set page", await pg.locator(".exname").count() == 1)
        check("set 2 prefilled with 65", await pg.input_value("[data-in=w]") == "65")
        # overshoot → weight bump
        await done_set(pg, None, 13)
        check("strong set raises weight for next set", await pg.input_value("[data-in=w]") == "70")
        check("bump hint shown", "Strong set" in await pg.inner_text(".focus"))
        # edit a logged set
        await pg.click(".donesets button >> nth=0")
        await pg.click("[data-a=adj][data-k=es_r][data-d='1']")
        await pg.click(".sheet-card [data-a=closeSheet] >> nth=-1")
        check("edit set: reps 10→11", await ev(pg, "S.cur.items[S.cur.idx].done[0].r") == 11)
        await pg.click(".donesets button >> nth=1")
        await pg.click("[data-a=delSet]")
        check("delete set", await ev(pg, "S.cur.items[S.cur.idx].done.length") == 1)
        await done_set(pg, 70, 10)
        await done_set(pg, 70, 9)
        check("bench complete moves on", (await pg.inner_text(".exname")) == "Incline Dumbbell Press")
        check("dumbbell label 'lb each'", "lb each" in await pg.inner_text(".big-inputs"))

        # swap partway through: 1 set done then swap
        await done_set(pg, 30, 11)
        await pg.click("[data-a=swap]")
        check("swap sheet shows similar", (await pg.locator(".sheet-card h4").first.inner_text()).upper() == "SIMILAR")
        await pg.check("#swapPlan")
        await pg.click(".pick >> nth=0")
        name = await pg.inner_text(".exname")
        check("swap after a set keeps the done set and continues with the new lift", name == "Incline Smith Press" and await ev(pg, "S.cur.items.find(i=>i.ex==='incline_db').sets") == 1, name)
        check("swap also changed the plan", await ev(pg, "S.plan[0].items.some(i=>i.ex==='incline_smith')"))
        check("new lift has 2 sets left", "OF 2" in (await pg.inner_text(".eyebrow-set")).upper())

        # skip set / skip lift / undo
        await pg.click("[data-a=skipSet]")
        check("skip set lowers sets", "OF 1" in (await pg.inner_text(".eyebrow-set")).upper())
        await pg.click("[data-a=skip]")
        check("skip lift moves on", (await pg.inner_text(".exname")) == "Seated Dumbbell Shoulder Press")

        # queue: undo skip, drag, do now, swap from queue
        await pg.click(".wk-top [data-a=queue]")
        await shot(pg, "05_queue")
        check("queue lists the 4 lifts left", await pg.locator("#queueList li").count() == 4)
        check("queue shows skipped lift with undo", await pg.locator(".sheet-card [data-a=unskip]").count() == 1)
        await pg.click(".sheet-card [data-a=unskip]")
        check("undo skip puts it back", await pg.locator("#queueList li").count() == 5)
        check("undo skip keeps the current lift as now", (await pg.locator("#queueList .t").first.inner_text()).startswith("Seated Dumbbell Shoulder Press"))
        before = await pg.locator("#queueList .t").all_inner_texts()
        hb = await pg.locator("#queueList .handle").nth(3).bounding_box()
        x, y = hb["x"] + hb["width"] / 2, hb["y"] + hb["height"] / 2
        await pg.mouse.move(x, y); await pg.mouse.down()
        for k in range(1, 16):
            await pg.mouse.move(x, y - k * 16)
        await pg.mouse.up()
        after = await pg.locator("#queueList .t").all_inner_texts()
        check("drag moves a lift to the top", after[0].replace(" now","") == before[3].replace(" now",""), f"{before} -> {after}")
        await pg.click(".sheet-card [data-a=closeSheet] >> nth=-1")
        check("top of queue becomes current lift", after[0].startswith(await pg.inner_text(".exname")))
        await pg.click(".blip")
        check("up-next line opens queue", await pg.locator("#queueList").count() == 1)
        await pg.click("#queueList [data-a=doNow] >> nth=-1")
        check("do now jumps to that lift", "Triceps Extension" in await pg.inner_text(".exname"))
        await pg.click(".wk-top [data-a=queue]")
        await pg.click("#queueList [data-a=qSwap] >> nth=0")
        check("swap from queue opens picker", await pg.locator(".pick").count() > 5)
        await pg.click(".sheet-x")

        # reload mid-workout keeps state, including rest
        await done_set(pg, 30, 12, skip_rest=False)
        await pg.reload()
        check("reload mid-rest resumes rest page", await pg.locator(".rest-page").count() == 1)
        await pg.click(".rest-page [data-a=restSkip]")

        # End sheet: keep going
        await pg.click(".wk-top [data-a=finish]")
        check("end sheet offers finish/keep/discard", await pg.locator(".sheet-card .btn").count() >= 3)
        await pg.click(".sheet-card [data-a=closeSheet] >> nth=-1")
        check("keep going stays in workout", await pg.locator(".exname").count() == 1)

        await finish_all(pg, 30, 12)
        await shot(pg, "06_all_done")
        check("all-done screen", "everything" in (await pg.inner_text(".focus")).lower())
        await pg.click(".focus [data-a=finish]")
        check("summary shows", await pg.locator("[data-a=saveWorkout]").count() == 1)
        await pg.click("[data-a=saveWorkout]")
        check("rating required", "tap a number" in (await toast(pg)).lower())
        await pg.click("[data-a=rate][data-r='7']")
        await shot(pg, "07_summary")
        await pg.click("[data-a=saveWorkout]")
        check("workout saved", await ev(pg, "S.workouts.length") == 1)
        check("rotation advanced to Pull A", "Pull A" in await pg.inner_text("[data-a=start]"))
        check("tabs back after workout", await pg.locator("#tabs").is_visible())
        check("this week shows 1 of 6", "1 of 6" in await pg.inner_text("#app"))
        bench = await ev(pg, "JSON.stringify(S.workouts[0].items.find(i=>i.ex==='bench_bb').sets)")
        check("bench sets saved correctly", bench == '[{"w":65,"r":11},{"w":70,"r":10},{"w":70,"r":9}]', bench)

        # ---------------- 4. low energy + other day ----------------
        await pg.click("[data-a=startDay] >> nth=1")
        await pg.click("[data-e=low]")
        day = await ev(pg, "S.cur.dayName")
        check("start a different day from Today", day != "Pull A", day)
        check("low energy: one less set", await ev(pg, "S.cur.items[0].sets") == 2)
        await pg.click(".wk-top [data-a=finish]")
        check("nothing logged → cancel prompt", "Cancel" in await pg.inner_text(".sheet-card h2"))
        await pg.click("[data-a=askOk]")
        check("cancelled workout not saved", await ev(pg, "S.cur === null && S.workouts.length === 1"))

        # ---------------- 5. progression across sessions ----------------
        # Build history directly: bench hit 10,10,10 at 70 → next time 75. Pulldown under range → lighter.
        await ev(pg, """
          S.workouts.forEach(w => { w.end -= 5*864e5; w.start -= 5*864e5; });
          const t = Date.now() - 2*864e5;
          S.workouts.push({id:t, dayId:'push_a', dayName:'Push A', start:t-3600e3, end:t, rating:6, items:[
            {ex:'bench_bb', min:6, max:10, sets:[{w:70,r:10},{w:70,r:10},{w:70,r:10}]},
            {ex:'cable_lateral', min:12, max:20, sets:[{w:15,r:16},{w:15,r:14},{w:15,r:13},{w:15,r:12}]}]});
          S.workouts.push({id:t+1, dayId:'pull_a', dayName:'Pull A', start:t-3500e3, end:t+1, rating:6, items:[
            {ex:'lat_pulldown', min:8, max:12, sets:[{w:100,r:5},{w:100,r:5},{w:100,r:4}]}]});
          S.workouts.sort((a,b)=>a.end-b.end); save();""")
        s1 = await ev(pg, "JSON.stringify(suggest({ex:'bench_bb',sets:3,min:6,max:10}))")
        check("all sets at top of range → +5 lb", json.loads(s1)["w"] == 75 and json.loads(s1)["kind"] == "up", s1)
        s2 = await ev(pg, "JSON.stringify(suggest({ex:'cable_lateral',sets:4,min:12,max:20}))")
        check("mixed reps → same weight, beat reps", json.loads(s2)["w"] == 15 and json.loads(s2)["r"] == 13, s2)
        s3 = await ev(pg, "JSON.stringify(suggest({ex:'lat_pulldown',sets:3,min:8,max:12}))")
        check("well under range → lighter", json.loads(s3)["w"] == 95 and json.loads(s3)["kind"] == "down", s3)
        s4 = await ev(pg, "JSON.stringify(suggest({ex:'assisted_pullup',sets:3,min:6,max:10}))")
        await ev(pg, "S.workouts.push({id:9, dayId:'pull_b', dayName:'Pull B', start:1, end:Date.now()-864e5, items:[{ex:'assisted_pullup',min:6,max:10,sets:[{w:50,r:10},{w:50,r:10},{w:50,r:10}]}]}); S.workouts.sort((a,b)=>a.end-b.end)")
        s5 = await ev(pg, "suggest({ex:'assisted_pullup',sets:3,min:6,max:10}).w")
        check("assisted lift progresses by LESS assist", s5 == 45, str(s5))
        await ev(pg, "S.workouts = S.workouts.filter(w=>w.id!==9); save()")

        # Next Push A session shows last time + up hint
        await pg.click("[data-a=go][data-v=plan]")
        await pg.click("[data-a=openDay][data-i='0']")
        await pg.click("[data-a=pickDay]") if await pg.locator("[data-a=pickDay]").count() else None
        await pg.click("[data-a=go][data-v=today]")
        await pg.click("[data-a=start]")
        await pg.click("[data-e=great]")
        check("next session prefills 75", await pg.input_value("[data-in=w]") == "75")
        check("shows last time", "70×10, 70×10, 70×10" in await pg.inner_text(".lastline"))
        check("up hint", "up 5 lb" in (await pg.inner_text(".hint")).lower())
        await pg.click(".wk-top [data-a=finish]")
        await pg.click("[data-a=askOk]")

        # ---------------- 6. deload ----------------
        await pg.click("[data-a=go][data-v=settings]")
        await pg.click("[data-a=deloadNow]")
        check("lighter week on", await ev(pg, "isDeload()"))
        await pg.click("[data-a=go][data-v=today]")
        check("lighter-week card on Today", "Lighter week" in await pg.inner_text("#app"))
        await pg.click("[data-a=start]")
        check("deload skips energy question and halves sets", await ev(pg, "S.cur && S.cur.deload && S.cur.items[0].sets === 2"))
        check("deload hint", "Lighter week" in await pg.inner_text(".hint"))
        await pg.click(".wk-top [data-a=finish]"); await pg.click("[data-a=askOk]")
        await pg.click("[data-a=skipDeload]")
        check("skip lighter week → week 1", await ev(pg, "!isDeload() && cycleWeek()%6===0"))
        # early deload advice from 4 very hard workouts
        await ev(pg, "S.cycleStart = weekStart() - 3*7*864e5; S.workouts.slice(-3).forEach(w=>w.rating=9); S.workouts.push({id:77,dayId:'legs_a',dayName:'Legs A',start:1,end:Date.now()-1000,rating:9,items:[]}); save(); render()")
        check("very hard ratings suggest a lighter week", "Maybe take a lighter week" in await pg.inner_text("#app"))
        await ev(pg, "S.workouts = S.workouts.filter(w=>w.id!==77); S.workouts.forEach(w=>w.rating=6); save(); render()")

        # ---------------- 7. plan ----------------
        await pg.click("[data-a=go][data-v=plan]")
        await shot(pg, "08_plan")
        await no_overflow(pg, "plan")
        check("plan lists 6 days", await pg.locator("[data-a=openDay]").count() == 6)
        await pg.click("[data-a=openDay][data-i='2']")
        check("day page opens", (await pg.inner_text(".page-head h1")) == "Legs A")
        order0 = await pg.locator("#dragList .t").all_inner_texts()
        hb = await pg.locator("#dragList .handle").nth(0).bounding_box()
        x, y = hb["x"] + hb["width"] / 2, hb["y"] + hb["height"] / 2
        await pg.mouse.move(x, y); await pg.mouse.down()
        for k in range(1, 14):
            await pg.mouse.move(x, y + k * 16)
        await pg.mouse.up()
        order1 = await pg.locator("#dragList .t").all_inner_texts()
        check("drag reorders plan", order1[0] == order0[1] and order0[0] in order1[1:4], f"{order0} -> {order1}")
        await pg.reload()
        await pg.click("[data-a=go][data-v=plan]"); await pg.click("[data-a=openDay][data-i='2']")
        check("plan order persists", await pg.locator("#dragList .t").all_inner_texts() == order1)
        await pg.click("[data-a=editItem] >> nth=0")
        await shot(pg, "09_item_sheet")
        await pg.click("[data-a=adj][data-k=p_sets][data-d='1']")
        for _ in range(8):
            await pg.click("[data-a=adj][data-k=p_min][data-d='1']")
        it = json.loads(await ev(pg, "JSON.stringify(S.plan[2].items[0])"))
        check("edit sets +1", it["sets"] == 4, str(it))
        check("min above max pushes max up", it["min"] <= it["max"], str(it))
        await pg.click("[data-a=adj][data-k=p_rest][data-d='1']")
        check("rest +15", await ev(pg, "S.plan[2].items[0].rest") == it["rest"] + 15)
        await pg.click("[data-a=planSwap]")
        await pg.click(".pick >> nth=0")
        check("swap exercise in plan", await ev(pg, "S.plan[2].items[0].ex") != order1[0])
        await pg.click("[data-a=editItem] >> nth=5")
        await pg.click("[data-a=planRemove]")
        check("remove lift", await ev(pg, "S.plan[2].items.length") == 5)
        await pg.click("[data-a=addEx]")
        await pg.click(".pick >> text=Cable Hip Abduction")
        check("add exercise", await ev(pg, "S.plan[2].items.at(-1).ex") == "cable_abduction")
        await pg.click("[data-a=pickDay]")
        check("make this next up", await ev(pg, "S.next") == 2)
        await pg.click("[data-a=resetDay]")
        await pg.click("[data-a=askOk]")
        check("reset day to original", await ev(pg, "JSON.stringify(S.plan[2])===JSON.stringify(BM_DAYS[2])"))
        await pg.click("[data-a=go][data-v=plan]")
        check("tapping Plan tab returns to the day list", await pg.locator("[data-a=openDay]").count() == 6)
        await pg.click("[data-a=openDay][data-i='0']"); await pg.click("[data-a=closeDay]")
        check("back arrow returns to list", await pg.locator("[data-a=openDay]").count() == 6)
        check("weekly sets per muscle shown", await pg.locator(".mrow").count() == 11)

        # ---------------- 8. progress (with 6 weeks of history) ----------------
        await ev(pg, """
          const now = Date.now();
          for (let i = 12; i >= 1; i--) {
            const t = now - i*3*864e5;
            S.workouts.push({id:t, dayId:'legs_b', dayName:'Legs B', start:t-3600e3, end:t, rating:6+(i%3), items:[
              {ex:'hip_thrust', min:8, max:12, sets:[{w:95+ (12-i)*5, r:10},{w:95+(12-i)*5, r:9}]},
              {ex:'rdl', min:8, max:12, sets:[{w:85, r:10},{w:85,r:10}]} ]});
          }
          S.workouts.sort((a,b)=>a.end-b.end); save();""")
        await pg.click("[data-a=go][data-v=progress]")
        await pg.click("[data-a=chartEx][data-ex=hip_thrust]")
        await shot(pg, "10_progress", True)
        await no_overflow(pg, "progress")
        check("strength chart draws a line", await pg.locator(".chart path").count() >= 1)
        check("best so far shown", "Best so far" in await pg.inner_text("#app"))
        check("stuck lift detected (RDL flat)", "Romanian Deadlift" in await pg.inner_text("#app"))
        check("workouts per week chart", await pg.locator(".chart rect").count() == 8)
        check("avg sleep tile = 8", "8" in await pg.inner_text(".tiles"))

        # ---------------- 9. log ----------------
        await pg.click("[data-a=go][data-v=log]")
        await pg.click(".qbtn >> nth=0"); await pg.click(".qbtn >> nth=1")
        check("quick add protein", await ev(pg, "proteinOn()") == 40)
        await pg.click("[data-a=customP]")
        await pg.fill("#customG", "500"); await pg.click("[data-a=saveCustomP]")
        check("custom protein rejects 500 g", await ev(pg, "proteinOn()") == 40)
        await pg.fill("#customG", "32"); await pg.click("[data-a=saveCustomP]")
        check("custom protein adds 32", await ev(pg, "proteinOn()") == 72)
        await pg.click("[data-a=delP] >> nth=0")
        check("delete protein entry", await ev(pg, "proteinOn()") == 47)
        await pg.click("[data-a=redoSleep]")
        check("change sleep reopens form", await pg.locator("[data-a=saveSleep]").count() == 1)
        await pg.click("[data-a=sleepQ][data-q=Poor]"); await pg.click("[data-a=saveSleep]")
        check("sleep updated", await ev(pg, "S.sleep[ymd()].q") == "Poor")
        await shot(pg, "11_log", True)
        await no_overflow(pg, "log")
        n = await ev(pg, "S.workouts.length")
        await pg.click(".wk >> nth=0")
        check("past workout expands", await pg.locator(".wdetail").count() == 1)
        await pg.click("[data-a=delWorkout]"); await pg.click("[data-a=askOk]")
        check("delete past workout", await ev(pg, "S.workouts.length") == n - 1)

        # ---------------- 10. settings ----------------
        await pg.click("[data-a=go][data-v=settings]")
        await shot(pg, "12_settings", True)
        await no_overflow(pg, "settings")
        await pg.fill("[data-in=bw]", "145"); await pg.press("[data-in=bw]", "Tab")
        check("body weight change updates protein goal", await ev(pg, "proteinTarget()") == 116)
        await pg.click("[data-a=inc][data-k=dumbbell][data-v='2.5']")
        check("dumbbell jump 2.5", await ev(pg, "S.settings.inc.dumbbell") == 2.5)
        await pg.click("[data-a=bar][data-v='35']")
        check("bar weight 35", await ev(pg, "S.settings.bar") == 35 and await ev(pg, "plates(55)") == "10 per side")
        await pg.click("[data-a=sound]")
        check("sound toggle off", await ev(pg, "S.settings.sound") is False)
        await pg.click("[data-a=sound]")
        async with pg.expect_download() as dl:
            await pg.click("[data-a=export]")
        d = await dl.value
        path = SP + "/backup.json"
        await d.save_as(path)
        data = json.load(open(path))
        check("backup downloads with all workouts", len(data["workouts"]) == await ev(pg, "S.workouts.length"))
        check("backup date recorded", await ev(pg, "!!S.lastBackup"))
        bad = SP + "/bad.json"; open(bad, "w").write('{"hello":1}')
        await pg.set_input_files("#importFile", bad)
        await pg.wait_for_timeout(200)
        check("restore rejects a non-backup file", "isn't a BigMike backup" in await toast(pg))
        # erase then restore
        await pg.click("[data-a=wipe]"); await pg.click("[data-a=askOk]")
        check("erase everything → setup", await pg.locator("#setupW").count() == 1)
        await pg.fill("#setupW", "140"); await pg.click("[data-a=finishSetup]")
        await pg.click("[data-a=go][data-v=settings]")
        await pg.set_input_files("#importFile", path)
        await pg.wait_for_timeout(200)
        await pg.click("[data-a=askOk]")
        check("restore brings workouts back", await ev(pg, "S.workouts.length") == len(data["workouts"]))
        check("restore brings settings back", await ev(pg, "S.settings.bar") == 35)

        # backup reminder after 5+ workouts and no backup for 30 days
        await ev(pg, "S.lastBackup = Date.now() - 40*864e5; S.sleepAsked = ymd(); save()")
        await pg.click("[data-a=go][data-v=today]")
        check("monthly backup reminder", "Save a backup" in await pg.inner_text("#app"))

        # ---------------- 11. offline ----------------
        await pg.reload()
        await pg.wait_for_timeout(800)
        sw = await ev(pg, "navigator.serviceWorker.controller ? 'yes' : 'no'")
        check("offline worker active", sw == "yes")
        await ctx.set_offline(True)
        await pg.reload()
        check("opens with no internet", await pg.locator("[data-a=start]").count() == 1)
        await ctx.set_offline(False)

        # ---------------- 12. small and large phones ----------------
        for (w, h, nm) in [(375, 667, "se"), (430, 932, "promax")]:
            await pg.set_viewport_size({"width": w, "height": h})
            await pg.click("[data-a=go][data-v=today]")
            await no_overflow(pg, f"today {nm}")
            await pg.click("[data-a=start]")
            if await pg.locator("[data-e=normal]").count():
                await pg.click("[data-e=normal]")
            await no_overflow(pg, f"workout {nm}")
            box = await pg.locator("[data-a=doneSet]").bounding_box()
            check(f"Set done button visible without scrolling ({nm})", box["y"] + box["height"] <= h, str(box))
            await shot(pg, f"13_set_{nm}")
            await done_set(pg, 50, 10, skip_rest=False)
            await shot(pg, f"14_rest_{nm}")
            await no_overflow(pg, f"rest {nm}")
            await pg.click(".rest-page [data-a=restSkip]")
            await pg.click(".wk-top [data-a=finish]")
            await pg.click(".sheet-card [data-a=discard]"); await pg.click("[data-a=askOk]")

        await b.close()

    print()
    fails = [r for r in results if not r[0]]
    print(f"{len(results) - len(fails)} passed, {len(fails)} failed")
    for f in fails:
        print("  FAIL:", f[1], f[2])
    print("errors:", errors or "none")


asyncio.run(main())
