import Header from "@/components/Header";
import Image from "next/image";
import TextContainer from "@/components/TextContainer";
import ProcessedExample from "@/components/ProcessedExample";
import PuterAuth from "@/components/PuterAuth";
import styles from "./page.module.scss";

const original = `Cuando Lucía llegó a Montevideo, todavía no conocía bien la ciudad. Cada mañana salía a caminar por su barrio, escuchaba conversaciones en español y anotaba las palabras nuevas. Poco a poco empezó a reconocer expresiones, tiempos verbales y maneras distintas de decir lo mismo.

Le gustaba sentarse en un café, observar a la gente y tratar de entender lo que decían. A veces no comprendía todo, pero no se desanimaba. Sabía que aprender un idioma lleva tiempo, y que cada pequeña conversación era un paso adelante.`;

const result: { translation: string; explanation: Record<string, string> }[] = [
  {
    translation:
      "Когда Лусия приехала в Монтевидео, она ещё плохо знала город.",
    explanation: {
      Cuando: "когда; союз, вводящий придаточное времени",
      Lucía: "Лусия; имя собственное, подлежащее",
      llegó:
        "глагол llegar — «прибыть, приехать»; pretérito indefinido, 3-е лицо единственного числа; завершённое действие в прошлом",
      "a Montevideo": "в Монтевидео; предлог a обозначает направление движения",
      "todavía no": "ещё не; указывает, что ситуация сохранялась на тот момент",
      conocía:
        "глагол conocer — «знать, быть знакомой»; pretérito imperfecto, 3-е лицо единственного числа; продолжительное состояние в прошлом",
      bien: "хорошо; наречие, относится к глаголу conocía",
      "la ciudad":
        "город; существительное женского рода с определённым артиклем la",
    },
  },
  {
    translation:
      "Каждое утро она выходила гулять по своему району, слушала разговоры на испанском и записывала новые слова.",
    explanation: {
      "Cada mañana": "каждое утро; выражение регулярности",
      salía:
        "глагол salir — «выходить»; pretérito imperfecto, 3-е лицо единственного числа; повторяющееся действие в прошлом",
      "a caminar":
        "гулять, пройтись; конструкция salir a + infinitivo означает «выйти, чтобы что-то сделать»",
      "por su barrio":
        "по своему району; por указывает на движение по территории, su означает «её»",
      escuchaba:
        "глагол escuchar — «слушать»; pretérito imperfecto, 3-е лицо единственного числа",
      conversaciones:
        "разговоры, беседы; существительное женского рода во множественном числе",
      "en español": "на испанском языке",
      y: "и; соединительный союз",
      anotaba:
        "глагол anotar — «записывать»; pretérito imperfecto, 3-е лицо единственного числа",
      "las palabras nuevas":
        "новые слова; прилагательное nuevas согласуется с palabras в женском роде и множественном числе",
    },
  },
  {
    translation:
      "Постепенно она начала узнавать выражения, глагольные времена и разные способы сказать одно и то же.",
    explanation: {
      "Poco a poco": "понемногу, постепенно; устойчивое выражение",
      empezó:
        "глагол empezar — «начать»; pretérito indefinido, 3-е лицо единственного числа; обозначает начало завершённого этапа",
      "a reconocer":
        "узнавать, распознавать; после empezar используется конструкция empezar a + infinitivo",
      expresiones:
        "выражения; существительное женского рода во множественном числе",
      "tiempos verbales":
        "глагольные времена; прилагательное verbales согласуется с tiempos во множественном числе",
      "maneras distintas":
        "разные способы; distintas согласуется с maneras в женском роде и множественном числе",
      "de decir":
        "сказать, говорить; предлог de связывает maneras с последующим инфинитивом",
      "lo mismo":
        "одно и то же; нейтральный артикль lo превращает прилагательное mismo в абстрактное понятие",
    },
  },
  {
    translation:
      "Ей нравилось сидеть в кафе, наблюдать за людьми и пытаться понять, что они говорили.",
    explanation: {
      "Le gustaba":
        "ей нравилось; gustar строится так, что понравившееся действие является подлежащим, а le означает «ей»; gustaba — pretérito imperfecto",
      sentarse: "садиться или сидеть; возвратный глагол sentarse в инфинитиве",
      "en un café": "в кафе; un — неопределённый артикль мужского рода",
      observar: "наблюдать; инфинитив, зависящий от gustaba",
      "a la gente":
        "за людьми, на людей; перед обозначением людей используется личный предлог a",
      y: "и; соединяет однородные действия",
      "tratar de":
        "пытаться; после tratar в значении попытки используется предлог de",
      entender: "понимать; инфинитив после tratar de",
      "lo que": "то, что; относительная конструкция",
      decían:
        "глагол decir — «говорить»; pretérito imperfecto, 3-е лицо множественного числа; передаёт продолжавшиеся разговоры",
    },
  },
  {
    translation: "Иногда она понимала не всё, но не падала духом.",
    explanation: {
      "A veces": "иногда; устойчивое обстоятельственное выражение",
      "no comprendía":
        "не понимала; comprender в pretérito imperfecto, 3-е лицо единственного числа",
      todo: "всё; неопределённое местоимение",
      pero: "но; противительный союз",
      "no se desanimaba":
        "не падала духом, не расстраивалась; возвратный глагол desanimarse в pretérito imperfecto, 3-е лицо единственного числа",
    },
  },
  {
    translation:
      "Она знала, что изучение языка требует времени и что каждый небольшой разговор был шагом вперёд.",
    explanation: {
      Sabía:
        "глагол saber — «знать»; pretérito imperfecto, 3-е лицо единственного числа; описывает состояние или убеждение в прошлом",
      que: "что; союз, вводящий придаточное предложение",
      "aprender un idioma":
        "изучать язык; инфинитивная конструкция выступает в роли подлежащего",
      "lleva tiempo":
        "требует времени, занимает время; llevar употребляется в настоящем времени, потому что это общее утверждение",
      "y que": "и что; вводит второе придаточное, зависящее от sabía",
      "cada pequeña conversación":
        "каждый небольшой разговор; pequeña стоит перед существительным и согласуется с conversación",
      era: "глагол ser — «быть»; pretérito imperfecto, 3-е лицо единственного числа",
      "un paso adelante": "шаг вперёд; устойчивое образное выражение",
    },
  },
];

export default function Home() {
  return (
    <div className={styles.page}>
      <Header />
      <main className="page-container pt-7 mobile-pt-6">
        <h1 className={`${styles.introTitle} font-sans font-bold line-heading`}>
          Welcome to Read and study
        </h1>
        <p
          className={`${styles.introText} mt-1 font-sans font-bold line-compact`}
        >
          Add a text in Spanish and get translations and explanations to help
          you learn.
        </p>
        <h2
          className={`${styles.exampleTitle} mt-7 mb-2 font-serif line-tight`}
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

        <ProcessedExample original={original} result={result} />

        <PuterAuth />

        {/* The rest of the page is paused for now.
        <section>
          <h3>Your text</h3>
          <p>¡Hola! ¡Me llamo Julia! ¿Y tú?</p>
          <h3>What you will get</h3>
          <button>Show translation</button>
          <div>Привет! Меня зовут Юлия! А тебя?</div>
          <button>Show explanation</button>
          <div>
            <p>hola - привет</p>
            <p>llamarse - звать, называться; me llamo - меня зовут</p>
            <p>y - и, а</p>
            <p>tú - ты</p>
          </div>
          <div>¡Hola! ¡Me llamo Julia! ¿Y tú?</div>
        </section>
        <section>
          To add your own texts, please log in:
          <form>
            <label>Email</label>
            <input />
            <label>Password</label>
            <input />
            <button>Log in</button>
          </form>
        </section>
        */}
      </main>
    </div>
  );
}
