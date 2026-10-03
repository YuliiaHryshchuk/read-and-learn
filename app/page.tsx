import Header from "@/components/Header";
import Image from "next/image";
import TextContainer from "@/components/TextContainer";
import ProcessedExample from "@/components/ProcessedExample";
import PuterAuth from "@/components/PuterAuth";
import type { StructuredAdaptationResult } from "@/lib/adaptation";
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
        "When Lucía arrived in Montevideo, she still did not know the city well. Every morning she went out for a walk around her neighborhood, listened to conversations in Spanish, and wrote down the new words. Little by little she began to recognize expressions, verb tenses, and different ways of saying the same thing.",
      explanation:
        "llegó — from llegar, Pretérito Indefinido de Indicativo, third person singular\nconocía — from conocer, Pretérito Imperfecto de Indicativo, third person singular; here “did not know ... well”\nsalía — from salir, Pretérito Imperfecto de Indicativo, third person singular\nescuchaba — from escuchar, Pretérito Imperfecto de Indicativo, third person singular\nanotaba — from anotar, Pretérito Imperfecto de Indicativo, third person singular\nempezó — from empezar, Pretérito Indefinido de Indicativo, third person singular\nreconocer — from reconocer, infinitive\nexpresiones, tiempos verbales y maneras distintas de decir lo mismo — “verb tenses” is the natural English rendering of “tiempos verbales”; “different ways of saying the same thing” explains “maneras distintas de decir lo mismo”",
    },
    {
      id: "fragment-2",
      text: "Le gustaba sentarse en un café, observar a la gente y tratar de entender lo que decían. A veces no comprendía todo, pero no se desanimaba. Sabía que aprender un idioma lleva tiempo, y que cada pequeña conversación era un paso adelante.",
      translation:
        "She liked sitting in a café, watching people, and trying to understand what they were saying. Sometimes she did not understand everything, but she did not get discouraged. She knew that learning a language takes time, and that every small conversation was a step forward.",
      explanation:
        "le gustaba — from gustar, Pretérito Imperfecto de Indicativo, third person singular; literally “it was pleasing to her,” here “she liked”\nsentarse — from sentarse, infinitive\nobservar — from observar, infinitive\ntratar de entender — “try to understand”; tratar is from tratar, infinitive in a verbal construction with de + entender\ndecían — from decir, Pretérito Imperfecto de Indicativo, third person plural\ncomprendía — from comprender, Pretérito Imperfecto de Indicativo, third person singular\nse desanimaba — from desanimarse, Pretérito Imperfecto de Indicativo, third person singular; “did not get discouraged” / “did not lose heart”\nsabía — from saber, Pretérito Imperfecto de Indicativo, third person singular\nlleva — from llevar, Presente de Indicativo, third person singular; in this context, “takes”\nera — from ser, Pretérito Imperfecto de Indicativo, third person singular\npaso adelante — fixed expression meaning “step forward” / progress",
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
              Up to 300 words
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

        <PuterAuth />
      </main>
    </div>
  );
}
