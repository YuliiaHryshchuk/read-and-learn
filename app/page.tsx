import Header from "@/components/Header";
import Image from "next/image";
import TextContainer from "@/components/TextContainer";
import ProcessedExample from "@/components/ProcessedExample";
import PuterAuth from "@/components/PuterAuth";
import type { StructuredAdaptationResult } from "@/lib/adaptation";
import { MAX_MATERIAL_WORDS } from "@/lib/materialLimits";
import styles from "./page.module.scss";

const original = `Cuando Lucía llegó a Montevideo, todavía no conocía bien la ciudad. Cada mañana salía a caminar por su barrio, escuchaba conversaciones en español y anotaba las palabras nuevas. Poco a poco empezó a reconocer expresiones, tiempos verbales y maneras distintas de decir lo mismo.

Le gustaba sentarse en un café, observar a la gente y tratar de entender lo que decían. A veces no comprendía todo, pero no se desanimaba. Sabía que aprender un idioma lleva tiempo, y que cada pequeña conversación era un paso adelante.`;

const result: StructuredAdaptationResult = {
  kind: "structured",
  sourceText: original,
  fragments: [
    {
      id: "fragment-1",
      text: "Cuando Lucía llegó a Montevideo, todavía no conocía bien la ciudad. Cada mañana salía a caminar por su barrio, escuchaba conversaciones en español y anotaba las palabras nuevas. Poco a poco empezó a reconocer expresiones, tiempos verbales y maneras distintas de decir lo mismo.",
      translation:
        "When Lucía arrived in Montevideo, she still did not know the city well. Every morning she went out to walk around her neighborhood, listened to conversations in Spanish, and wrote down the new words. Little by little she began to recognize expressions, verb tenses, and different ways of saying the same thing.",
      explanation:
        "\"Cuando Lucía llegó a Montevideo\" — \"llegó\" is the preterite, 3rd person singular of \"llegar\". It presents the arrival as a completed event that sets the time frame for the rest of the description.\n\"todavía no conocía bien la ciudad\" — \"conocía\" is the imperfect, 1st person/3rd person singular of \"conocer\". Here it describes a continuing background state at the time of arrival, so the sentence means she did not yet know the city well.\n\"Cada mañana salía a caminar\" — \"salía\" is the imperfect, 3rd person singular of \"salir\". It shows a repeated habitual action in the past, not a single departure.\n\"a caminar\" — infinitive after \"salir a\". This construction means “go out to walk” or “set out to walk,” expressing purpose.\n\"escuchaba conversaciones en español\" — \"escuchaba\" is the imperfect, 3rd person singular of \"escuchar\". It matches the habitual pattern of her routine and provides background action alongside the other repeated past actions.\n\"anotaba las palabras nuevas\" — \"anotaba\" is the imperfect, 3rd person singular of \"anotar\". It also describes a repeated habit, showing another action that regularly accompanied her morning routine.\n\"empezó a reconocer\" — \"empezó\" is the preterite, 3rd person singular of \"empezar\". It marks the point when a new process began. \"a reconocer\" is an infinitive in the construction \"empezar a + infinitive\", which means “begin to recognize.” The preterite for \"empezó\" highlights the starting point, while the infinitive names the activity that followed.\n\"expresiones, tiempos verbales y maneras distintas de decir lo mismo\" — these are the objects of \"reconocer\". \"tiempos verbales\" means verb tenses, and \"maneras distintas de decir lo mismo\" means different ways of saying the same thing, with \"decir\" as an infinitive inside the noun phrase describing those ways.",
    },
    {
      id: "fragment-2",
      text: "Le gustaba sentarse en un café, observar a la gente y tratar de entender lo que decían. A veces no comprendía todo, pero no se desanimaba. Sabía que aprender un idioma lleva tiempo, y que cada pequeña conversación era un paso adelante.",
      translation:
        "She liked to sit in a café, watch people, and try to understand what they were saying. Sometimes she did not understand everything, but she did not get discouraged. She knew that learning a language takes time, and that every small conversation was a step forward.",
      explanation:
        "\"Le gustaba sentarse en un café, observar a la gente y tratar de entender\" — \"gustaba\" is the imperfect, 3rd person singular of \"gustar\" with an indirect object pronoun \"le\". This construction expresses that she liked these activities in a general, ongoing past sense. The three non-finite verbs, \"sentarse\", \"observar\", and \"tratar\", are infinitives linked to \"gustaba\" because after \"gustar\" the liked activities are typically expressed as infinitives.\n\"sentarse\" — reflexive infinitive of \"sentar(se)\". Here it means “to sit down / to sit” and is part of the list of activities she liked.\n\"observar a la gente\" — \"observar\" is an infinitive coordinated with the other actions, showing another activity in the same liking construction.\n\"tratar de entender\" — \"tratar\" is an infinitive in the fixed pattern \"tratar de + infinitive\", meaning “try to.” \"de entender\" completes that pattern, so the whole phrase means “try to understand.”\n\"lo que decían\" — \"decían\" is the imperfect, 3rd person plural of \"decir\". It refers to what people were saying in the background while she listened, so the imperfect presents their speech as ongoing rather than completed.\n\"A veces no comprendía todo\" — \"comprendía\" is the imperfect, 1st/3rd person singular of \"comprender\". It describes a repeated or general state in the past: at some moments she did not understand everything.\n\"pero no se desanimaba\" — \"se desanimaba\" is the imperfect, 3rd person singular of the reflexive verb \"desanimarse\". It shows a continuing attitude across repeated occasions: she did not lose heart.\n\"Sabía que aprender un idioma lleva tiempo\" — \"sabía\" is the imperfect, 3rd person singular of \"saber\". It gives her stable background knowledge. \"aprender\" is an infinitive functioning as the subject of \"lleva\" in the clause that follows: the act of learning a language takes time. \"lleva\" is the present, 3rd person singular of \"llevar\" used in a general truth, not tied to a specific moment.\n\"cada pequeña conversación era un paso adelante\" — \"era\" is the imperfect, 3rd person singular of \"ser\". It presents the statement as a general evaluation or background judgment, not a one-time event. \"un paso adelante\" is a fixed metaphor meaning “a step forward.”",
    },
  ],
};

export default function Home() {
  return (
    <div className={styles.page}>
      <Header />
      <main className="page-container pt-7 mobile-pt-6">
        <h1 className={`${styles.introTitle} font-sans font-bold line-heading`}>
          Welcome to Read &amp; Learn
        </h1>
        <p className={`${styles.introText} mt-3 font-sans line-compact`}>
          Add text in the language you&apos;re learning and get translations and
          explanations to help you master the material easily.
        </p>
        <h2
          className={`${styles.exampleTitle} mt-5 mb-2 font-serif line-tight`}
        >
          Example
        </h2>

        <TextContainer
          icon={
            <Image src="/icons/document.svg" width={22} height={22} alt="" />
          }
          title="Your text"
          actions={[
            <span
              className="text-muted text-md white-space-nowrap mobile-text-xs"
              key="word-limit"
            >
              Up to {MAX_MATERIAL_WORDS} words
            </span>,
          ]}
        >
          <div
            className={`${styles.exampleText} text-default text-xl line-body white-space-pre-line`}
            lang="es"
          >
            <p>{original}</p>
          </div>
        </TextContainer>

        <ProcessedExample result={result.fragments} />

        <PuterAuth redirectAfterSignIn="/new-text" />
      </main>
    </div>
  );
}
