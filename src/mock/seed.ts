import { placeholderImage } from '../lib/utils'
import type { Account, Comment, Database, Post, Revision } from '../types'

// Dữ liệu mẫu cho prototype. Mật khẩu dùng chung cho mọi tài khoản demo (xem README).
export const DEMO_PASSWORD = 'mediq123'

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()
const H = 60
const D = 24 * H

function account(
  id: string,
  username: string,
  displayName: string,
  role: Account['role'],
  bio: string,
  extra: Partial<Account> = {},
): Account {
  return {
    id,
    email: `${username}@example.com`,
    username,
    displayName,
    password: DEMO_PASSWORD,
    bio,
    avatar: null,
    role,
    status: 'ACTIVE',
    suspendedUntil: null,
    suspendReason: null,
    twoFA: false,
    passkeys: [],
    createdAt: ago(60 * D),
    ...extra,
  }
}

function post(
  id: string,
  kind: Post['kind'],
  authorId: string,
  minutesAgo: number,
  title: string,
  body: string,
  tagIds: string[],
  images: string[] = [],
): Post {
  return { id, kind, authorId, title, body, tagIds, images, status: 'ACTIVE', createdAt: ago(minutesAgo), editedAt: null }
}

function comment(
  id: string,
  postId: string,
  parentId: string | null,
  authorId: string,
  minutesAgo: number,
  body: string,
): Comment {
  return { id, postId, parentId, authorId, body, images: [], status: 'ACTIVE', createdAt: ago(minutesAgo), editedAt: null }
}

export function createSeed(): Database {
  const accounts: Account[] = [
    account('u-lan', 'lan.nguyen', 'Nguyễn Thị Lan', 'NORMAL_USER', 'Mẹ của hai bé, quan tâm sức khoẻ gia đình và dinh dưỡng trẻ nhỏ.'),
    account('u-tuan', 'bs.tranminhtuan', 'BS.CKI Trần Minh Tuấn', 'VERIFIED_DOCTOR', 'Bác sĩ Nhi khoa, hơn 10 năm điều trị bệnh lý hô hấp và nhiễm trùng ở trẻ em.', {
      passkeys: [{ id: 'pk-1', name: 'MacBook của tôi', createdAt: ago(40 * D) }],
    }),
    account('u-an', 'bs.nguyenvanan', 'BS.CKII Nguyễn Văn An', 'VERIFIED_DOCTOR', 'Bác sĩ nội tiết, nhiều năm kinh nghiệm điều trị đái tháo đường và rối loạn chuyển hoá.'),
    account('u-admin', 'admin_01', 'Lê Hùng Cường', 'ADMIN', '', { twoFA: true }),
    account('u-binh', 'nguyen.binh', 'Nguyễn Bình', 'NORMAL_USER', 'Bác sĩ nội trú Nhi khoa, đang chờ xác minh hồ sơ.'),
    account('u-ha', 'tran.ha', 'Trần Thu Hà', 'NORMAL_USER', 'Bác sĩ da liễu.'),
    account('u-99', 'user_99', 'Minh Shop Sức Khoẻ', 'NORMAL_USER', 'Chuyên tư vấn sản phẩm giảm cân.'),
    account('u-spam', 'spam_01', 'Tài khoản 01', 'NORMAL_USER', '', {
      status: 'SUSPENDED',
      suspendedUntil: new Date(Date.now() + 5 * D * 60_000).toISOString(),
      suspendReason: 'Đăng lặp lại nội dung quảng cáo trong phần bình luận.',
    }),
    account('u-hoa', 'hoa.pham', 'Phạm Thanh Hoa', 'NORMAL_USER', 'Nhân viên văn phòng, hay tìm hiểu về giấc ngủ và đau đầu.'),
  ]

  const tags = [
    ['t-nhi', 'Nhi khoa'],
    ['t-tim', 'Nội tim mạch'],
    ['t-da', 'Da liễu'],
    ['t-noitiet', 'Nội tiết'],
    ['t-thankinh', 'Thần kinh'],
    ['t-dinhduong', 'Dinh dưỡng'],
    ['t-tieuhoa', 'Tiêu hoá'],
    ['t-hohap', 'Hô hấp'],
  ].map(([id, name]) => ({ id, name, createdAt: ago(45 * D), deleted: false }))

  const posts: Post[] = [
    post('q-1', 'question', 'u-lan', 5 * H, 'Bé 3 tuổi bị phát ban đỏ sau khi sốt 2 ngày, có nguy hiểm không?',
      'Bé nhà em sốt 38,5 độ từ hôm kia, uống hạ sốt thì đỡ. Sáng nay hết sốt nhưng **nổi các nốt đỏ nhỏ ở ngực và lưng**, không ngứa, bé vẫn chơi và ăn được.\n\nEm có chụp lại ảnh vùng da và kết quả xét nghiệm máu hôm qua. Em nên theo dõi tại nhà hay cần đưa bé đi khám ngay ạ?',
      ['t-nhi', 't-da'], [placeholderImage('Ảnh vùng da ở lưng', 12), placeholderImage('Kết quả xét nghiệm máu', 200)]),
    post('q-2', 'question', 'u-hoa', 2 * D, 'Đau đầu kéo dài sau khi ngủ dậy, có cần đi khám không?',
      'Khoảng hai tuần nay sáng nào ngủ dậy em cũng đau âm ỉ vùng sau gáy, đến trưa thì giảm. Em ngủ khoảng 6 tiếng mỗi đêm và dùng máy tính nhiều.\n\nTriệu chứng này có đáng lo không và nên khám chuyên khoa nào?',
      ['t-thankinh']),
    post('q-3', 'question', 'u-lan', 3 * D, 'Chỉ số đường huyết lúc đói 6,4 mmol/L có phải tiền đái tháo đường?',
      'Mẹ em 58 tuổi, khám sức khoẻ định kỳ có đường huyết lúc đói 6,4 mmol/L, HbA1c 6,1%. Bác sĩ dặn theo dõi thêm. Gia đình nên điều chỉnh chế độ ăn thế nào?',
      ['t-noitiet', 't-dinhduong'], [placeholderImage('Phiếu xét nghiệm', 160)]),
    post('q-4', 'question', 'u-99', 6 * H, 'Thuốc giảm cân cấp tốc không cần kê đơn — ai cần liên hệ',
      'Bên mình có thuốc giảm cân cấp tốc, giảm 5kg trong 7 ngày, không cần kê đơn, không cần ăn kiêng. Ai cần để lại số điện thoại.',
      ['t-dinhduong'], [placeholderImage('thuoc_1.jpg', 30), placeholderImage('thuoc_2.jpg', 340)]),
    post('q-5', 'question', 'u-hoa', 5 * D, 'Trẻ 18 tháng ho về đêm kéo dài hơn một tuần',
      'Con em ho nhiều về đêm, không sốt, ban ngày gần như bình thường. Đã uống siro ho 5 ngày chưa đỡ. Có nên cho bé đi chụp phổi không ạ?',
      ['t-nhi', 't-hohap']),
    post('q-6', 'question', 'u-binh', 8 * D, 'Nổi mẩn ngứa ở tay sau khi đổi nước rửa chén',
      'Hai bàn tay em nổi mẩn đỏ, ngứa và bong da nhẹ sau khi đổi loại nước rửa chén mới. Em nên xử trí thế nào?',
      ['t-da']),
    post('q-7', 'question', 'u-lan', 12 * D, 'Người lớn tuổi hay chóng mặt khi đứng dậy đột ngột',
      'Bố em 67 tuổi, đang dùng thuốc huyết áp, thỉnh thoảng chóng mặt khi đứng dậy nhanh. Có phải do thuốc không?',
      ['t-tim']),
    post('a-1', 'article', 'u-an', 20 * D, 'Chế độ ăn cho người bệnh đái tháo đường type 2',
      'Chế độ ăn là nền tảng của điều trị đái tháo đường type 2, song song với vận động và thuốc.\n\n## Nguyên tắc chung\n\n- Chia nhỏ bữa ăn, ăn đúng giờ.\n- Ưu tiên tinh bột hấp thu chậm: gạo lứt, yến mạch, khoai lang.\n- Tăng rau xanh và chất xơ ở mỗi bữa.\n\n## Thực phẩm nên hạn chế\n\n- Nước ngọt, bánh kẹo, nước ép trái cây đóng chai.\n- Mỡ động vật, đồ chiên rán nhiều lần.\n\n> Mỗi người bệnh cần phác đồ dinh dưỡng riêng. Hãy trao đổi với bác sĩ điều trị trước khi thay đổi chế độ ăn.\n\n## Theo dõi\n\nĐo đường huyết theo lịch bác sĩ hướng dẫn và ghi lại để điều chỉnh khẩu phần.',
      ['t-noitiet', 't-dinhduong'], [placeholderImage('Khẩu phần mẫu trong ngày', 140)]),
    post('a-2', 'article', 'u-tuan', 9 * D, 'Sốt phát ban ở trẻ nhỏ: khi nào cần đưa trẻ đi khám?',
      'Sốt phát ban là tình trạng thường gặp ở trẻ dưới 5 tuổi, phần lớn do siêu vi và tự khỏi.\n\n## Dấu hiệu thường gặp\n\n- Sốt 2–4 ngày, sau khi hạ sốt thì nổi ban hồng nhạt ở thân mình.\n- Trẻ vẫn chơi, ăn uống được khi hết sốt.\n\n## Cần đi khám ngay khi\n\n- Sốt trên 39,5°C không đáp ứng thuốc hạ sốt.\n- Ban dạng chấm xuất huyết, ấn không mất màu.\n- Trẻ lừ đừ, bỏ bú, co giật hoặc khó thở.\n\n## Chăm sóc tại nhà\n\nCho trẻ uống đủ nước, mặc thoáng, dùng paracetamol **10–15 mg/kg mỗi 4–6 giờ** khi sốt từ 38,5°C.',
      ['t-nhi', 't-da'], [placeholderImage('Ban hồng ở thân mình', 350)]),
    post('a-3', 'article', 'u-an', 30 * D, 'Nhận biết sớm dấu hiệu hạ đường huyết',
      'Hạ đường huyết có thể xảy ra ở người đang dùng insulin hoặc thuốc hạ đường huyết.\n\n## Triệu chứng\n\n- Run tay, vã mồ hôi, đói cồn cào.\n- Hoa mắt, lú lẫn, nói khó.\n\n## Xử trí\n\nDùng ngay 15 g đường hấp thu nhanh, đo lại sau 15 phút.',
      ['t-noitiet']),
    post('a-4', 'article', 'u-tuan', 15 * D, 'Ho kéo dài ở trẻ: những nguyên nhân thường gặp',
      'Ho trên 4 tuần ở trẻ cần được đánh giá nguyên nhân thay vì chỉ điều trị triệu chứng.\n\n## Nguyên nhân thường gặp\n\n- Hen phế quản.\n- Viêm mũi xoang, chảy dịch mũi sau.\n- Trào ngược dạ dày thực quản.\n\n## Khi nào cần khám\n\nHo kèm sụt cân, khó thở, sốt kéo dài hoặc ho ra máu.',
      ['t-nhi', 't-hohap']),
  ]
  // Bài a-2 đã được sửa một lần (đính chính liều paracetamol).
  posts.find((p) => p.id === 'a-2')!.editedAt = ago(2 * D)

  const comments: Comment[] = [
    comment('c-1', 'q-1', null, 'u-tuan', 3 * H, 'Chào chị Lan. Sốt 2–3 ngày rồi **nổi ban khi đã hết sốt**, bé vẫn chơi và ăn được là diễn tiến điển hình của sốt phát ban do siêu vi, thường tự hết sau 2–3 ngày.\n\nChị theo dõi tại nhà và đưa bé đi khám ngay nếu ban dạng chấm xuất huyết ấn không mất màu, bé sốt lại, lừ đừ hoặc bỏ ăn.'),
    comment('c-2', 'q-1', 'c-1', 'u-lan', 2 * H + 30, 'Dạ em cảm ơn bác sĩ. Ban của bé ấn vào thì nhạt màu đi ạ. Em có cần kiêng tắm cho bé không?'),
    comment('c-3', 'q-1', 'c-2', 'u-tuan', 2 * H, 'Không cần kiêng tắm chị nhé. Tắm nước ấm, lau khô nhẹ nhàng, mặc đồ thoáng.'),
    comment('c-4', 'q-1', null, 'u-hoa', 4 * H, 'Bé nhà mình cũng từng bị y hệt, khoảng 3 ngày là lặn hết ban.'),
    comment('c-5', 'q-2', null, 'u-lan', 1 * D, 'Mình cũng hay bị vậy khi dùng gối quá cao, bạn thử đổi gối xem.'),
    comment('c-6', 'q-3', null, 'u-an', 2 * D, 'Với đường huyết đói 6,4 mmol/L và HbA1c 6,1%, cô thuộc nhóm **tiền đái tháo đường**. Giai đoạn này có thể đảo ngược bằng điều chỉnh ăn uống và vận động 150 phút mỗi tuần. Nên xét nghiệm lại sau 3–6 tháng.'),
    comment('c-7', 'q-4', null, 'u-spam', 5 * H, 'Mình dùng rồi hiệu quả lắm, mọi người liên hệ shop nhé.'),
    comment('c-8', 'q-4', 'c-7', 'u-99', 4 * H + 30, 'Cảm ơn bạn, ai cần cứ nhắn mình.'),
    comment('c-9', 'q-4', null, 'u-hoa', 4 * H, 'Thuốc giảm cân không kê đơn kiểu này rất nguy hiểm, mọi người cẩn thận.'),
    comment('c-10', 'q-4', 'c-9', 'u-99', 3 * H, 'Bạn chưa dùng sao biết.'),
    comment('c-11', 'a-1', null, 'u-lan', 6 * D, 'Bài viết rất dễ hiểu, em đã lưu lại để áp dụng cho mẹ. Cảm ơn bác sĩ.'),
    comment('c-12', 'a-2', null, 'u-lan', 4 * H, 'Đúng lúc em đang cần, cảm ơn bác sĩ Tuấn.'),
    comment('c-13', 'q-5', null, 'u-tuan', 4 * D, 'Ho về đêm kéo dài trên 1 tuần, không sốt thì chưa cần chụp phổi ngay. Chị nên cho bé khám để nghe phổi và loại trừ hen hoặc chảy dịch mũi sau.'),
  ]

  const revisions: Revision[] = [
    ...posts.map<Revision>((p) => ({
      id: `r-${p.id}-1`, targetType: 'post', targetId: p.id, version: 1, title: p.title,
      body: p.id === 'a-2' ? p.body.replace('**10–15 mg/kg mỗi 4–6 giờ**', '2 viên sau khi ăn') : p.body,
      images: p.images, tagIds: p.tagIds, editorId: p.authorId, createdAt: p.createdAt,
    })),
    { id: 'r-a-2-2', targetType: 'post', targetId: 'a-2', version: 2, title: posts.find((p) => p.id === 'a-2')!.title, body: posts.find((p) => p.id === 'a-2')!.body, images: posts.find((p) => p.id === 'a-2')!.images, tagIds: ['t-nhi', 't-da'], editorId: 'u-tuan', createdAt: ago(2 * D) },
    ...comments.map<Revision>((c) => ({
      id: `r-${c.id}-1`, targetType: 'comment', targetId: c.id, version: 1, title: null, body: c.body, images: [], tagIds: [], editorId: c.authorId, createdAt: c.createdAt,
    })),
  ]

  return {
    accounts,
    tags,
    posts,
    comments,
    revisions,
    doctorProfiles: [
      { accountId: 'u-tuan', title: 'Bác sĩ Chuyên khoa I', specialty: 'Nhi khoa', workplace: 'Bệnh viện Nhi Đồng 1, TP.HCM', startYear: 2014, license: '012345/HCM-CCHN', visible: true, revoked: false },
      { accountId: 'u-an', title: 'Bác sĩ Chuyên khoa II', specialty: 'Nội tiết', workplace: 'Bệnh viện Chợ Rẫy, TP.HCM', startYear: 2012, license: '008723456/HCM-CCHN', visible: true, revoked: false },
    ],
    verifications: [
      { id: 'DV-041', accountId: 'u-tuan', type: 'NEW', status: 'APPROVED', license: '012345/HCM-CCHN', specialty: 'Nhi khoa', title: 'Bác sĩ Chuyên khoa I', workplace: 'Bệnh viện Nhi Đồng 1, TP.HCM', startYear: 2014, files: [placeholderImage('CCHN mặt trước', 205)], reason: null, createdAt: ago(42 * D), decidedAt: ago(41 * D),
        history: [{ at: ago(42 * D), action: 'SUBMITTED', status: 'PENDING', note: 'Đã gửi 1 tệp minh chứng' }, { at: ago(41 * D), action: 'APPROVED', status: 'APPROVED', note: '' }] },
      { id: 'DV-038', accountId: 'u-an', type: 'NEW', status: 'APPROVED', license: '008723456/HCM-CCHN', specialty: 'Nội tiết', title: 'Bác sĩ Chuyên khoa II', workplace: 'Bệnh viện Chợ Rẫy, TP.HCM', startYear: 2012, files: [placeholderImage('CCHN mặt trước', 205)], reason: null, createdAt: ago(50 * D), decidedAt: ago(49 * D),
        history: [{ at: ago(50 * D), action: 'SUBMITTED', status: 'PENDING', note: 'Đã gửi 1 tệp minh chứng' }, { at: ago(49 * D), action: 'APPROVED', status: 'APPROVED', note: '' }] },
      { id: 'DV-045', accountId: 'u-binh', type: 'NEW', status: 'PENDING', license: '045678/HCM-CCHN', specialty: 'Nhi khoa', title: 'Bác sĩ nội trú', workplace: 'Bệnh viện Nhi Đồng 2, TP.HCM', startYear: 2021, files: [placeholderImage('CCHN mặt trước', 205), placeholderImage('Bằng bác sĩ', 45)], reason: null, createdAt: ago(1 * D), decidedAt: null,
        history: [{ at: ago(1 * D), action: 'SUBMITTED', status: 'PENDING', note: 'Đã gửi 2 tệp minh chứng' }] },
      { id: 'DV-042', accountId: 'u-ha', type: 'NEW', status: 'REJECTED', license: '033112/HCM-CCHN', specialty: 'Da liễu', title: 'Bác sĩ Chuyên khoa I', workplace: 'Bệnh viện Da Liễu TP.HCM', startYear: 2016, files: [placeholderImage('CCHN (ảnh mờ)', 0)], reason: 'Ảnh chụp chứng chỉ hành nghề bị mờ số hiệu và thiếu dấu giáp lai. Vui lòng chụp rõ nét mặt trước CCHN và nộp lại.', createdAt: ago(5 * D), decidedAt: ago(3 * D),
        history: [{ at: ago(5 * D), action: 'SUBMITTED', status: 'PENDING', note: 'Đã gửi 1 tệp minh chứng' }, { at: ago(3 * D), action: 'REJECTED', status: 'REJECTED', note: 'Ảnh CCHN bị mờ số hiệu' }] },
    ],
    votes: [
      { accountId: 'u-lan', targetType: 'comment', targetId: 'c-6', value: 1 },
      { accountId: 'u-hoa', targetType: 'comment', targetId: 'c-1', value: 1 },
      { accountId: 'u-binh', targetType: 'comment', targetId: 'c-1', value: 1 },
      { accountId: 'u-hoa', targetType: 'article', targetId: 'a-1', value: 1 },
      { accountId: 'u-lan', targetType: 'article', targetId: 'a-1', value: 1 },
      { accountId: 'u-binh', targetType: 'article', targetId: 'a-2', value: 1 },
      { accountId: 'u-hoa', targetType: 'comment', targetId: 'c-10', value: -1 },
    ],
    bookmarks: [
      { accountId: 'u-lan', postId: 'a-1', createdAt: ago(6 * D) },
      { accountId: 'u-lan', postId: 'q-2', createdAt: ago(1 * D) },
    ],
    reports: [
      { id: 'RP-108', reporterId: 'u-hoa', targetType: 'question', targetId: 'q-4', category: 'Quảng cáo thuốc, sản phẩm không rõ nguồn gốc', severity: 'HIGH', reason: 'Đăng bài quảng cáo thuốc giảm cân không kê đơn, không rõ nguồn gốc.', status: 'PENDING', createdAt: ago(3 * H), handledBy: null },
      { id: 'RP-109', reporterId: 'u-lan', targetType: 'comment', targetId: 'c-7', category: 'Thông tin y tế sai lệch', severity: 'MEDIUM', reason: 'Bình luận cò mồi cho bài quảng cáo thuốc.', status: 'REVIEWING', createdAt: ago(4 * H), handledBy: 'u-admin' },
      { id: 'RP-110', reporterId: 'u-lan', targetType: 'account', targetId: 'u-99', category: 'Giả mạo hoặc lừa đảo', severity: 'HIGH', reason: 'Tài khoản chuyên đăng bài bán thuốc.', status: 'PENDING', createdAt: ago(2 * H), handledBy: null },
    ],
    notifications: [
      { id: 'n-1', accountId: 'u-lan', type: 'COMMENT', actorId: 'u-tuan', title: 'BS.CKI Trần Minh Tuấn đã bình luận về câu hỏi của bạn', excerpt: 'Sốt 2–3 ngày rồi nổi ban khi đã hết sốt, bé vẫn chơi và ăn được là diễn tiến điển hình…', link: '/questions/q-1', read: false, createdAt: ago(3 * H) },
      { id: 'n-2', accountId: 'u-lan', type: 'REPLY', actorId: 'u-tuan', title: 'BS.CKI Trần Minh Tuấn đã trả lời bình luận của bạn', excerpt: 'Không cần kiêng tắm chị nhé. Tắm nước ấm, lau khô nhẹ nhàng…', link: '/questions/q-1', read: false, createdAt: ago(2 * H) },
      { id: 'n-3', accountId: 'u-lan', type: 'COMMENT', actorId: 'u-an', title: 'BS.CKII Nguyễn Văn An đã bình luận về câu hỏi của bạn', excerpt: 'Với đường huyết đói 6,4 mmol/L và HbA1c 6,1%, cô thuộc nhóm tiền đái tháo đường…', link: '/questions/q-3', read: true, createdAt: ago(2 * D) },
      { id: 'n-4', accountId: 'u-tuan', type: 'VERIFICATION_APPROVED', actorId: null, title: 'Hồ sơ xác minh bác sĩ đã được phê duyệt', excerpt: 'Tài khoản của bạn đã được cấp quyền Verified Doctor.', link: '/doctor-verification/status', read: true, createdAt: ago(41 * D) },
      { id: 'n-5', accountId: 'u-ha', type: 'VERIFICATION_REJECTED', actorId: null, title: 'Hồ sơ xác minh bác sĩ bị từ chối', excerpt: 'Ảnh chụp chứng chỉ hành nghề bị mờ số hiệu…', link: '/doctor-verification/status', read: false, createdAt: ago(3 * D) },
    ],
    auditLogs: [
      { id: 'al-3', actorId: 'u-admin', action: 'VERIFICATION_REJECTED', target: 'DV-042', metadata: { reason: 'Ảnh CCHN bị mờ số hiệu' }, createdAt: ago(3 * D) },
      { id: 'al-2', actorId: 'u-admin', action: 'VERIFICATION_APPROVED', target: 'DV-041', metadata: { license: '012345/HCM-CCHN' }, createdAt: ago(41 * D) },
      { id: 'al-1', actorId: 'u-admin', action: 'CREATE_TAG', target: 't-hohap', metadata: { tagName: 'Hô hấp' }, createdAt: ago(45 * D) },
    ],
  }
}
