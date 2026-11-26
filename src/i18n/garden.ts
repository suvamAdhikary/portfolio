// Zen garden copy per locale. The English canvas strings stay inside the lazy garden chunk
// (GARDEN_TEXT_EN); the Japanese table is serialised into the page as a data attribute and
// handed to mountGarden(), so the chunk does not grow with each locale.
import type { GardenText } from '../scripts/zen-garden';
import type { Locale } from './config';

export interface GardenSectionText {
  eyebrow: string;
  title: string;
  intro: string;
  caption: string;
  hint: string;
  seasonGroup: string;
  canvasLabel: string;
  /** Season button labels; `null` keeps the English name next to the kanji. */
  seasons: Record<'spring' | 'summer' | 'autumn' | 'winter', string> | null;
  /** Full canvas text table, or `null` for the built-in English one. */
  canvas: GardenText | null;
}

const en: GardenSectionText = {
  eyebrow: 'Systems',
  title: 'A quiet garden of busy systems',
  intro:
    'The backend I build is meant to feel like this: calm on the surface while events keep moving underneath.',
  caption:
    'Each stone is a kind of system I build. Events flow from producers through Kafka to consumers, staying calm under load and recovering from failure.',
  hint: 'Drag to rake the sand. Tap a stone to add load, hold it to break it.',
  seasonGroup: 'Season',
  canvasLabel:
    'A top-down Japanese rock garden that changes with the seasons: raked sand, moss islands with stones, streams carrying floating lanterns, a koi pond with a red bridge, a stone lantern and a seasonal tree. Each stone stands for a real system: Payments and a GraphQL gateway send lanterns, standing for events, down the streams into the Kafka pond, then on to Consumers and into the MongoDB pond.',
  seasons: null,
  canvas: null,
};

const ja: GardenSectionText = {
  eyebrow: 'Systems',
  title: '静かな庭と、休みなく動くシステム',
  intro:
    '私がつくるバックエンドは、この庭のようでありたいと考えています。表面は穏やかなまま、その下ではイベントが絶えず流れ続けています。',
  caption:
    '石の一つひとつが、私が手がけるシステムを表しています。イベントはプロデューサーから Kafka を経てコンシューマーへと流れ、負荷がかかっても落ち着いて処理し、障害が起きても回復します。',
  hint: '砂をドラッグすると砂紋を描けます。石をタップすると負荷が増え、長押しすると障害を再現します。',
  seasonGroup: '季節',
  canvasLabel:
    '季節とともに移ろう枯山水を上から見た図。砂紋、石を据えた苔の島、灯籠を運ぶ流れ、赤い橋がかかる鯉の池、石灯籠、季節の木があります。石はそれぞれ実際のシステムを表し、決済と GraphQL ゲートウェイがイベントを表す灯籠を流れに乗せて Kafka の池へ送り、そこからコンシューマーを経て MongoDB の池へ届けます。',
  seasons: { spring: '春', summer: '夏', autumn: '秋', winter: '冬' },
  canvas: {
    nodes: {
      pay: '決済',
      gql: 'GraphQL ゲートウェイ',
      kafka: 'イベント基盤（Kafka）',
      cons: 'コンシューマー',
      mongo: 'MongoDB',
    },
    short: { gql: 'GraphQL', kafka: 'Kafka', cons: 'コンシューマー' },
    seasons: { spring: '春', summer: '夏', autumn: '秋', winter: '冬' },
    fail: {
      pay: ['決済を一時停止。GraphQL はイベントの送信を続けています。', '決済が復旧しました。'],
      gql: [
        'GraphQL ゲートウェイを一時停止。決済はイベントの送信を続けています。',
        'GraphQL ゲートウェイが復旧しました。',
      ],
      kafka: [
        'Kafka ブローカーが停止。プロデューサーはイベントを手元で保持しています…',
        'Kafka が復旧。プロデューサーが保留分を送り出し、欠損はありません。',
      ],
      cons: [
        'コンシューマーが停止。Kafka がイベントをバッファしています…',
        'コンシューマーが復旧。バッファを消化し、欠損はありません。',
      ],
      mongo: [
        'MongoDB が利用不可。コンシューマーは書き込みを保持し、リトライしています…',
        'MongoDB が復旧。書き込みが追いつきました。',
      ],
    },
    shake: {
      winter: '裸の枝から雪が滑り落ちます。',
      autumn: '紅葉がはらはらと舞い散ります。',
      spring: '桜の花びらがひらひらと舞い落ちます。',
      summer: '夏の風に葉がそよぎます。',
    },
    recovering: '{name}は復旧中です。少しお待ちください。',
    burst: '{name}：イベント +5。Kafka がバーストを受け止めます。',
    spike: '{name}へのトラフィックが急増。バッファが吸収する様子をご覧ください。',
    feed: '鯉が何かと寄ってきました。',
    lanternOn: '灯籠に火をともしました。',
    lanternOff: '灯籠の火を消しました。庭は眠りにつきます。',
    seasonSet: '庭は{name}の装いになりました。',
    steady: 'すべてのシステムが安定稼働中です。',
    today: '今日の季節',
    stoneLabel: '{name}：負荷を追加',
    stoneTitle: '{name}。Enter で負荷を追加、F で障害を再現します。',
    pond: '鯉の池：鯉にえさをあげる',
    tree: '木：枝を揺らす',
    lantern: '石灯籠：火をともす／消す',
    down: '停止中',
    unavailable: '利用不可',
    buffer: 'バッファ {n}',
    saved: '{n}件 保存',
  },
};

export const gardenText: Record<Locale, GardenSectionText> = { en, ja };
