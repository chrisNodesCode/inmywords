import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const USER_ID = 'dev-user-local'

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

const entries = [
  // ── Day 68: Long, raw processing — diagnosis memory ──────────────────────
  {
    userId: USER_ID,
    content: `I've been thinking about the day I got the ADHD diagnosis a lot lately. I was 31. The psychiatrist had this clipboard and she kept writing things down and I kept apologising for talking too fast and she said "you don't need to apologise" but I did it three more times anyway. She said the word "inattentive" and something clicked and broke at the same time.

I drove home and sat in my car for forty minutes. Not crying. Just… processing. My whole life rearranging itself in my head. Every job I got fired from. Every relationship I ruined by forgetting things. Every teacher who said I was bright but unfocused, like it was a character flaw I'd chosen.

I was 31. I had been doing this for 31 years without a map.

I called my mum. She cried. She said "I always wondered." I wanted to be angry but I was too tired.

The diagnosis didn't fix anything. I keep having to remind myself of that. It was a label, not a cure. But it was also the first time a professional looked at me and said: this is real, this is in you, this is not a failure of will. I didn't know how much I needed to hear that until I heard it.`,
    createdAt: daysAgo(68),
  },

  // ── Day 63: Short, fragmented — sensory overload ───────────────────────
  {
    userId: USER_ID,
    content: `Office was too loud today. Someone microwaved fish again. The fluorescent light in the corner has been flickering for two weeks and I finally said something and my manager looked at me like I was complaining about nothing.

Couldn't finish my report. Kept starting sentences and losing them. Left early and said I had a headache, which isn't entirely a lie — the sensory overload always ends up there eventually.

Took three hours on the couch to feel like a person again.`,
    createdAt: daysAgo(63),
  },

  // ── Day 59: Medium, reflective — masking fatigue ──────────────────────
  {
    userId: USER_ID,
    content: `Had a team lunch today. Two hours. I smiled and made jokes and asked follow-up questions and laughed at the right moments and contributed opinions about the new roadmap and nobody would have known.

On the walk back I had this sudden desperate need to be alone, like a physical thing in my chest. I locked myself in the accessible bathroom for ten minutes and just stood there with the lights off. That's the only way I can describe it: I needed to stop being a person for a little while.

I've been doing this — the lunch thing, the bathroom thing — for years. I didn't have a name for it until recently. Masking. Performing neurotypical. My therapist calls it "borrowed energy." You're spending something you don't have. And the invoice always comes later.

Tonight I can't talk to anyone. Not even a text. My brain is offline.`,
    createdAt: daysAgo(59),
  },

  // ── Day 55: Short — good day / flow state ──────────────────────────────
  {
    userId: USER_ID,
    content: `Got into a flow state at 10am and looked up and it was 4pm. Finished the entire feature. The kind of focus that feels like flying. I forget this is possible until it happens.

On these days I feel like a different person. I wonder if this is what it's like for everyone all the time.`,
    createdAt: daysAgo(55),
  },

  // ── Day 52: Medium — workplace incident ─────────────────────────────────
  {
    userId: USER_ID,
    content: `Got pulled into a meeting I wasn't told about until 4 minutes before. My manager said "just a quick sync" and it turned into a 45-minute review of everything I haven't done this sprint. In front of the team.

I went non-verbal halfway through. Not literally — I kept saying things — but I was watching myself from slightly outside my body. I heard myself say "I'll prioritise that" and "understood" and "I can get that to you by Thursday" and I don't know if any of it was true.

Wrote this down when I got back to my desk so I'd remember what was said. My notes are: "velocity thing, the PR, Thursday, stakeholder thing." I don't know what the stakeholder thing is.

I need to send a follow-up email but I'm afraid of it. I'll do it tomorrow. I always say that.`,
    createdAt: daysAgo(52),
  },

  // ── Day 48: Short, fragmented — executive function ──────────────────────
  {
    userId: USER_ID,
    content: `Couldn't start work until 2pm. Not because I didn't want to. I just couldn't make the first thing happen. Sat at my desk for three hours watching the cursor. Made six cups of tea, drank two.

The task wasn't hard. I know it isn't hard. That's the worst part.`,
    createdAt: daysAgo(48),
  },

  // ── Day 45: Long — medical appointment ──────────────────────────────────
  {
    userId: USER_ID,
    content: `Had a GP appointment today. The first one with the new doctor — mine left the practice. I had a list. I always make a list because I know I'll forget what I came for the moment I'm in the room.

She was fine. Efficient. Asked about my sleep and I said "not great" and she did that doctor thing where she types without looking at you. I showed her the list. She frowned slightly — not unkindly, just surprised maybe — and said "that's a lot of things."

I wanted to say: yes, that's why I wrote them down, because I've spent years in appointments getting halfway through and then the doctor wraps up and I walk out and remember the actual thing I came for in the car park. But I didn't say that. I said "I know, I can prioritise."

We got through four items. The other three are still on the list. I've booked a follow-up.

She did mention she'd like to do a medication review for the ADHD prescription. That word: review. It always makes me nervous. Like they might take it away. Like I'll have to prove again that I need it.`,
    createdAt: daysAgo(45),
  },

  // ── Day 41: Short — sensory overload ────────────────────────────────────
  {
    userId: USER_ID,
    content: `Couldn't wear my usual clothes today. Every fabric felt wrong. Spent twenty minutes in the wardrobe and ended up in my softest hoodie which is not appropriate for a client call but I did it anyway with the camera off.

Small victories.`,
    createdAt: daysAgo(41),
  },

  // ── Day 38: Medium — good day ────────────────────────────────────────────
  {
    userId: USER_ID,
    content: `Meal prepped for the first time in two months. Not everything — just lunches. But I did it and the kitchen isn't destroyed and I feel obscenely proud about this.

I'm trying to remember that doing the maintenance tasks is genuinely hard for me and not an indication of some fundamental character failure. My occupational therapist calls them "invisible effort" tasks. The ones that look easy from the outside and feel enormous from the inside.

Today I did the invisible effort thing and it worked. Writing it down so I remember.`,
    createdAt: daysAgo(38),
  },

  // ── Day 35: Long — masking fatigue / post-social crash ──────────────────
  {
    userId: USER_ID,
    content: `Friend's birthday. Thirty people. A pub I've been to before so I knew the layout, which helped. I had a plan: arrive early before it gets loud, find a corner seat, leave by 10.

I arrived at 7:15. By 8:30 there were too many people and I couldn't track the conversations any more. I kept starting sentences and losing the thread. Someone would say something and I'd start formulating a response and by the time I got to the end of what they were saying I'd forgotten the beginning. I laughed at things half a beat late.

I stayed until 11 because it was her birthday and I love her. She hugged me when I left and said "so glad you came" and I meant it when I said I was too.

Got home, sat on the floor for a while. Not sad exactly. Just emptied. Like a phone at 2%.

Sunday is already blocked out. I'm not doing anything. I'm not answering messages. My body is going to need the whole day to come back to baseline.

This is the thing people don't understand: it's not that I don't enjoy it. I did enjoy it. I love those people. I just pay a different price than they do.`,
    createdAt: daysAgo(35),
  },

  // ── Day 31: Short — executive function ──────────────────────────────────
  {
    userId: USER_ID,
    content: `Replied to emails today. Only three weeks late.

No, I'm not joking. Three weeks. They had been sitting in my inbox with the little unread dot and every time I saw them I felt something close to dread, which is not a rational response to an email. I know that. My brain doesn't care.

Replied to all of them. They were fine. None of them were urgent. One of them was someone asking how I was.`,
    createdAt: daysAgo(31),
  },

  // ── Day 28: Medium — workplace ───────────────────────────────────────────
  {
    userId: USER_ID,
    content: `Made a mistake in the deployment. Not catastrophic, rolled back in twenty minutes, nobody noticed except the people who would have noticed. My manager was good about it. "These things happen."

I've been sitting with the shame spiral for three hours anyway. I know it's disproportionate. I know intellectually that one deployment error in six months is not evidence that I am bad at my job. I know this.

And still. The loop: you should have caught it, you rushed it, you didn't check properly, what if next time it's worse, what if they're only being nice to your face.

I'm writing it down here to make it external. To put it somewhere other than my chest.`,
    createdAt: daysAgo(28),
  },

  // ── Day 24: Short — neutral / reflective ────────────────────────────────
  {
    userId: USER_ID,
    content: `Decent day. Finished a thing. Ate lunch at the table instead of my desk. Went for a short walk.

I keep trying to notice and name the decent days because my memory tends to archive the bad ones more reliably. Proof of concept: today was fine. I was fine.`,
    createdAt: daysAgo(24),
  },

  // ── Day 21: Long — sensory overload + work ───────────────────────────────
  {
    userId: USER_ID,
    content: `The overhead strip light in the open plan area blew and they replaced it today. The new one is slightly brighter and a different colour temperature — cooler, whiter — and I am aware that this sounds incredibly petty. It isn't something I can explain in a way that doesn't sound petty. It's a lightbulb.

But I spent the afternoon with a headache that started behind my left eye and moved into my temples and I couldn't concentrate and I made small errors in my code that I kept having to undo and by 5pm I was exhausted in the specific way that comes from spending all day fighting my own nervous system.

I mentioned it to a colleague and she said "oh, does it bother you? I actually like it." And I said "yeah, it's fine" because what else do I say.

I've been thinking about whether to disclose formally. Whether to talk to HR about reasonable adjustments. I've looked at the guidance twice. It says I'm entitled to ask. It doesn't say they'll listen, or that it won't change things, or that I won't spend the next year being the person who complained about the lightbulb.`,
    createdAt: daysAgo(21),
  },

  // ── Day 17: Medium — good day / win ─────────────────────────────────────
  {
    userId: USER_ID,
    content: `Presented to the stakeholder group today. Fifteen minutes, I had notes on my phone, I made eye contact with people instead of the screen, I remembered my transitions, I didn't apologise once.

Afterwards my manager said "that was great." I said "thank you" without immediately qualifying it or minimising it. Progress.

I practiced it six times last night. People don't know the work that goes into looking like someone who just does this naturally.`,
    createdAt: daysAgo(17),
  },

  // ── Day 13: Short — fragmented / bad day ────────────────────────────────
  {
    userId: USER_ID,
    content: `Bad day. Not one specific thing. Just everything slightly wrong. Overslept. Missed a message. Said the wrong thing in a meeting and spent the rest of the day replaying it.

The replay thing is so exhausting. The same thirty seconds, on repeat. Did I sound rude? Did they take it wrong? Should I send a follow-up?

I didn't send the follow-up. I went to bed at 9pm.`,
    createdAt: daysAgo(13),
  },

  // ── Day 9: Medium — executive function + neutral ─────────────────────────
  {
    userId: USER_ID,
    content: `Used the body double method today — put a "working session" in the calendar and just left the camera on while I coded. No one else joined. Didn't matter. The presence of the possibility of someone watching was enough to make me actually work.

My therapist says this is a legitimate accommodation, not a trick. I'm still slightly embarrassed by it but it got three tickets done so.

Also: I cleaned my keyboard. Unplanned. Apparently that was the task my brain had decided was happening. The keyboard is very clean.`,
    createdAt: daysAgo(9),
  },

  // ── Day 5: Long — reflective / accumulation ─────────────────────────────
  {
    userId: USER_ID,
    content: `I've been journalling here for a couple of months now. Looking back at some of the earlier entries.

What strikes me is how consistent the patterns are. The bad days cluster around social events and unexpected changes. The good days are when I had control of my environment and nobody surprised me before 10am. This is not shocking information — I know my own patterns — but seeing it written down is different. It becomes evidence. Not just feeling, but record.

I started this partly because my therapist suggested externalising thoughts. Partly because I'm tired of losing the bad days to vague memory and only being able to say "I've been struggling" when someone asks without being able to say how, or when, or what specifically happened.

I want to be able to say: on this date, this occurred, and this was the impact. Not to blame anyone. Just to have it exist somewhere outside my head.

There's something else too, though I'm still figuring out how to say it. A lot of my life has been spent being told my experiences weren't quite real, or were overreactions, or would improve if I just tried differently. Having a record is a way of insisting on my own reality. Saying: no, this happened, I was here, it was like this.

I'm not sure who the record is for. Maybe just me. Maybe that's enough.`,
    createdAt: daysAgo(5),
  },

  // ── Day 2: Short — current, grounded ────────────────────────────────────
  {
    userId: USER_ID,
    content: `Quiet day. Worked from home. Didn't have to mask once.

These are the days that remind me how much energy I spend on the other kind.`,
    createdAt: daysAgo(2),
  },
]

async function main() {
  console.log('Seeding dev journal entries...')
  await prisma.journalEntry.deleteMany({ where: { userId: USER_ID } })
  await prisma.journalEntry.createMany({ data: entries.map(e => ({ ...e, tags: [] })) })
  console.log(`✓ Seeded ${entries.length} entries for userId="${USER_ID}"`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
