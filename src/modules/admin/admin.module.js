import TcpServer from '../../classes/server';
import dotenv from 'dotenv';
import onRequest from './admin.service';

dotenv.config();

class AdminModule extends TcpServer {
  constructor() {
    // 부모 클래스 생성자 호출
    super('admin', process.env.ADMIN_PORT ? Number(process.env.ADMIN_PORT) : 3002, [
      'DELETE/admin',
      'POST/reports',
      'GET/reports',
      'PATCH/reports',
    ]);
    let contentId;
    this.connectToDistributor(process.env.HOST, process.env.DIS_PORT, (data) => {
      console.log('Distributor Notification', data);
    });
    //admin/post 통신
    this.connectToPosts(
      process.env.HOST,
      process.env.POSTS_PORT,
      (data) => {
        console.log('Posts Notification', data);
      },
      contentId,
    );
    this.result;

    this.connectToComments(
      process.env.HOST,
      process.env.POSTS_PORT,
      (data) => {
        console.log('Comments Notification', data);
      },
      contentId,
    );
    this.result;

    this.connectToThreads(
      process.env.HOST,
      process.env.THREADS_PORT,
      (data) => {
        console.log('Threads Notification', data);
      },
      contentId,
    );
    this.result;
  }

  // 클라이언트 요청에 따른 비즈니스 로직 호출
  async onRead(socket, data) {
    console.log(data);
    onRequest(socket, data.method, data.uri, data.params, data.key, (s, packet) => {
      socket.write(JSON.stringify(packet) + '¶');
    });
  }
}

const adminModule = new AdminModule(); // 인스턴스 생성
export default adminModule;
